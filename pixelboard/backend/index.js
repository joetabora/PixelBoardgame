import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 4000;
const DEFAULT_SIZE = 50;

// Create initial board filled with null (no color)
const createGrid = (size, fill = null) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => fill));

let boardSize = DEFAULT_SIZE;
let boardState = createGrid(boardSize);
let boardOwnership = createGrid(boardSize);

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.get("/", (_req, res) => {
  res.send("PixelBoard backend is running.");
});

const userLabels = new Map(); // socket.id -> username
const lastPixelByUser = new Map(); // socket.id -> { x, y, previousColor, previousOwner }
const paintCountByUser = new Map();
let nextUserNumber = 1;

const USERNAME_MAX_LENGTH = 20;

const buildLeaderboard = () =>
  Array.from(paintCountByUser.entries())
    .map(([socketId, count]) => ({
      username: userLabels.get(socketId) ?? "Player",
      count
    }))
    .filter((entry) => entry.username)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

const emitLeaderboard = () => {
  io.emit("leaderboard", { leaderboard: buildLeaderboard() });
};

const sanitizeUsername = (value) => {
  if (typeof value !== "string") return null;
  const collapsed = value.replace(/\s+/g, " ");
  const trimmed = collapsed.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, USERNAME_MAX_LENGTH);
};

const isUsernameTaken = (candidate, currentId) =>
  Array.from(userLabels.entries()).some(
    ([socketId, name]) => socketId !== currentId && name?.toLowerCase() === candidate.toLowerCase()
  );

io.on("connection", (socket) => {
  const userId = nextUserNumber++;
  let username = `Player #${userId}`;

  userLabels.set(socket.id, username);
  lastPixelByUser.set(socket.id, null);
  paintCountByUser.set(socket.id, 0);

  // Send current board state to newly connected client
  socket.emit("board_state", {
    board: boardState,
    owners: boardOwnership,
    size: boardSize,
    userId,
    username,
    count: io.engine.clientsCount,
    leaderboard: buildLeaderboard()
  });
  io.emit("user_count", { count: io.engine.clientsCount });
  emitLeaderboard();

  console.log(`${username} connected. Active users: ${io.engine.clientsCount}`);

  socket.on("paint_pixel", ({ x, y, color }) => {
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      x < 0 ||
      y < 0 ||
      x >= boardSize ||
      y >= boardSize ||
      typeof color !== "string"
    ) {
      console.warn(`[Paint rejected] ${username} attempted invalid pixel (${x}, ${y}) with color ${color}`);
      return;
    }

    const previousColor = boardState[y][x];
    const previousOwner = boardOwnership[y][x];

    boardState[y][x] = color;
    boardOwnership[y][x] = username;

    lastPixelByUser.set(socket.id, { x, y, previousColor, previousOwner });
    paintCountByUser.set(socket.id, (paintCountByUser.get(socket.id) ?? 0) + 1);

    console.log(`[Paint] ${username}: (${x}, ${y}) -> ${color}`);
    io.emit("pixel_updated", { x, y, color, owner: username });
    emitLeaderboard();
  });

  socket.on("undo_pixel", () => {
    const lastAction = lastPixelByUser.get(socket.id);
    if (!lastAction) {
      socket.emit("error_message", { message: "Nothing to undo yet." });
      return;
    }

    const { x, y, previousColor } = lastAction;
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= boardSize ||
      y >= boardSize
    ) {
      lastPixelByUser.set(socket.id, null);
      socket.emit("error_message", { message: "Unable to undo that pixel." });
      return;
    }

    const currentColor = boardState[y][x];
    boardState[y][x] = previousColor ?? null;
    boardOwnership[y][x] = lastAction.previousOwner ?? null;
    lastPixelByUser.set(socket.id, null);

    if (currentColor && (paintCountByUser.get(socket.id) ?? 0) > 0) {
      paintCountByUser.set(socket.id, paintCountByUser.get(socket.id) - 1);
    }

    console.log(`[Undo] ${username}: restored (${x}, ${y}) to ${previousColor ?? "empty"}`);
    io.emit("pixel_updated", {
      x,
      y,
      color: previousColor,
      owner: lastAction.previousOwner ?? null
    });
    emitLeaderboard();
  });

  socket.on("clear_board", () => {
    boardState = createGrid(boardSize);
    boardOwnership = createGrid(boardSize);
    lastPixelByUser.forEach((_value, key) => lastPixelByUser.set(key, null));
    paintCountByUser.forEach((_value, key) => paintCountByUser.set(key, 0));
    console.log(`[Clear] ${username} reset the board`);

    io.emit("board_cleared");
    io.emit("board_state", {
      board: boardState,
      owners: boardOwnership,
      size: boardSize,
      count: io.engine.clientsCount,
      leaderboard: buildLeaderboard()
    });
  });

  socket.on("chat_message", ({ message }) => {
    const rawMessage = typeof message === "string" ? message.trim() : "";
    if (!rawMessage) {
      return;
    }
    const trimmed = rawMessage.slice(0, 280);
    const payload = {
      username,
      message: trimmed,
      timestamp: Date.now()
    };

    console.log(`[Chat] ${payload.username}: ${payload.message}`);
    io.emit("chat_message", payload);
  });

  socket.on("change_username", ({ username: requested }) => {
    const sanitized = sanitizeUsername(requested);
    if (!sanitized) {
      socket.emit("error_message", { message: "Usernames must be 1-20 visible characters." });
      return;
    }
    if (isUsernameTaken(sanitized, socket.id)) {
      socket.emit("error_message", { message: "That username is already in use." });
      return;
    }

    const previous = username;
    username = sanitized;
    userLabels.set(socket.id, username);

    // Update ownership records for pixels painted by this user
    boardOwnership = boardOwnership.map((row) =>
      row.map((owner) => (owner === previous ? username : owner))
    );

    console.log(`[Rename] ${previous} is now ${username}`);
    emitLeaderboard();
    socket.emit("username_updated", { username });
    io.emit("user_renamed", { previous, username });
  });

  socket.on("disconnect", () => {
    userLabels.delete(socket.id);
    lastPixelByUser.delete(socket.id);
    paintCountByUser.delete(socket.id);
    console.log(`${username} disconnected. Active users: ${io.engine.clientsCount}`);
    io.emit("user_count", { count: io.engine.clientsCount });
    emitLeaderboard();
  });
});

server.listen(PORT, () => {
  console.log(`PixelBoard backend listening on port ${PORT}`);
});

