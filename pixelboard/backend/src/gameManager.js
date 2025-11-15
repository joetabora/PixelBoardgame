/**
 * Game Manager for Pixlnary
 * Handles role assignment, round management, word selection, and timers
 */

const ROUND_DURATION_SECONDS = 60; // Can be changed to 30 if desired
const DEFAULT_ROOM = "pixlnary";

// Word list for the game
const WORD_LIST = [
  "cat",
  "spaceship",
  "castle",
  "tree",
  "car",
  "dog",
  "sun",
  "moon",
  "house",
  "bird",
  "fish",
  "flower",
  "star",
  "heart",
  "boat",
  "plane",
  "robot",
  "dragon",
  "crown",
  "key",
  "sword",
  "shield",
  "apple",
  "cake",
  "pizza",
  "guitar",
  "piano",
  "book",
  "camera",
  "phone"
];

/**
 * Game Manager class
 */
export class GameManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> room state
    this.socketToRoom = new Map(); // socketId -> roomId
    this.socketToRole = new Map(); // socketId -> role
    this.timers = new Map(); // roomId -> timer interval
  }

  /**
   * Initialize a room if it doesn't exist
   */
  initializeRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        drawer: null,
        guesser: null,
        spectators: [],
        secretWord: null,
        timer: null,
        isRoundActive: false,
        roundStartTime: null
      });
    }
    return this.rooms.get(roomId);
  }

  /**
   * Assign a role to a player when they join
   */
  assignRole(socketId, roomId = DEFAULT_ROOM) {
    // Check if socket already has a role assigned
    const existingRole = this.socketToRole.get(socketId);
    if (existingRole) {
      return existingRole; // Already assigned, return existing role
    }

    const room = this.initializeRoom(roomId);
    
    // Clean up stale socket references (sockets that are no longer connected)
    if (room.drawer && !this.io.sockets.sockets.has(room.drawer)) {
      console.log(`[Cleanup] Removing stale drawer socket: ${room.drawer}`);
      room.drawer = null;
    }
    if (room.guesser && !this.io.sockets.sockets.has(room.guesser)) {
      console.log(`[Cleanup] Removing stale guesser socket: ${room.guesser}`);
      room.guesser = null;
    }
    room.spectators = room.spectators.filter(id => this.io.sockets.sockets.has(id));
    
    this.socketToRoom.set(socketId, roomId);

    let role = "spectator";

    if (!room.drawer) {
      role = "drawer";
      room.drawer = socketId;
      console.log(`[Role] ${socketId} assigned as drawer`);
    } else if (!room.guesser) {
      role = "guesser";
      room.guesser = socketId;
      console.log(`[Role] ${socketId} assigned as guesser`);
    } else {
      room.spectators.push(socketId);
      console.log(`[Role] ${socketId} assigned as spectator`);
    }

    this.socketToRole.set(socketId, role);
    return role;
  }

  /**
   * Remove a player from a room
   */
  removePlayer(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    if (!room) return;

    const role = this.socketToRole.get(socketId);

    if (role === "drawer") {
      room.drawer = null;
      // If there's a guesser, promote them to drawer
      if (room.guesser) {
        const newDrawer = room.guesser;
        room.drawer = newDrawer;
        room.guesser = null;
        this.socketToRole.set(newDrawer, "drawer");
        this.io.to(newDrawer).emit("assignRole", { role: "drawer" });
      }
    } else if (role === "guesser") {
      room.guesser = null;
      // Promote first spectator to guesser if available
      if (room.spectators.length > 0) {
        const newGuesser = room.spectators.shift();
        room.guesser = newGuesser;
        this.socketToRole.set(newGuesser, "guesser");
        this.io.to(newGuesser).emit("assignRole", { role: "guesser" });
      }
    } else {
      // Remove from spectators
      room.spectators = room.spectators.filter((id) => id !== socketId);
    }

    this.socketToRoom.delete(socketId);
    this.socketToRole.delete(socketId);
  }

  /**
   * Pick a random word from the word list
   */
  pickRandomWord() {
    return WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  }

  /**
   * Start a new round
   */
  startRound(roomId = DEFAULT_ROOM) {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    if (!room.drawer || !room.guesser) {
      return false; // Need both players
    }

    if (room.isRoundActive) {
      this.endRound(roomId, false); // End current round first
    }

    const word = this.pickRandomWord();
    room.secretWord = word;
    room.isRoundActive = true;
    room.roundStartTime = Date.now();

    console.log(`[Round Start] Word: ${word}, Drawer: ${room.drawer}, Guesser: ${room.guesser}`);

    // Send secret word to drawer only
    this.io.to(room.drawer).emit("secretWord", { word });
    console.log(`[Round Start] Sent secret word "${word}" to drawer ${room.drawer}`);

    // Notify all players that round has started
    this.io.to(roomId).emit("roundStart", {});

    // Start timer
    this.startTimer(roomId);

    return true;
  }

  /**
   * Start the round timer
   */
  startTimer(roomId = DEFAULT_ROOM) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear existing timer if any
    if (this.timers.has(roomId)) {
      clearInterval(this.timers.get(roomId));
    }

    let timeRemaining = ROUND_DURATION_SECONDS;

    const timerInterval = setInterval(() => {
      timeRemaining--;

      this.io.to(roomId).emit("timerUpdate", { time: timeRemaining });

      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        this.timers.delete(roomId);
        this.endRound(roomId, false); // Time's up
      }
    }, 1000);

    this.timers.set(roomId, timerInterval);

    // Send initial timer value
    this.io.to(roomId).emit("timerUpdate", { time: timeRemaining });
  }

  /**
   * Handle a guess attempt
   */
  handleGuess(socketId, guess) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room || !room.isRoundActive || !room.secretWord) return false;

    const role = this.socketToRole.get(socketId);
    if (role !== "guesser") return false; // Only guesser can guess

    const normalizedGuess = guess.toLowerCase().trim();
    const normalizedWord = room.secretWord.toLowerCase().trim();

    if (normalizedGuess === normalizedWord) {
      // Correct guess!
      this.endRound(roomId, true, socketId);
      return true;
    }

    return false; // Incorrect guess
  }

  /**
   * End a round
   */
  endRound(roomId = DEFAULT_ROOM, won = false, winnerId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear timer
    if (this.timers.has(roomId)) {
      clearInterval(this.timers.get(roomId));
      this.timers.delete(roomId);
    }

    if (won && winnerId) {
      this.io.to(roomId).emit("roundWon", {
        winnerId,
        word: room.secretWord
      });
    } else {
      this.io.to(roomId).emit("roundFailed", {
        word: room.secretWord
      });
    }

    room.isRoundActive = false;
    room.secretWord = null;
    room.roundStartTime = null;
  }

  /**
   * Get role for a socket
   */
  getRole(socketId) {
    return this.socketToRole.get(socketId) || "spectator";
  }

  /**
   * Check if a socket can draw
   */
  canDraw(socketId) {
    const role = this.getRole(socketId);
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return false;

    const room = this.rooms.get(roomId);
    if (!room || !room.isRoundActive) return false;

    return role === "drawer";
  }

  /**
   * Get room state for a socket
   */
  getRoomState(socketId) {
    const roomId = this.socketToRoom.get(socketId);
    if (!roomId) return null;

    const room = this.rooms.get(roomId);
    if (!room) return null;

    return {
      role: this.getRole(socketId),
      isRoundActive: room.isRoundActive,
      secretWord: this.getRole(socketId) === "drawer" ? room.secretWord : null
    };
  }

  /**
   * Get room by ID (for external access)
   */
  getRoom(roomId) {
    return this.rooms.get(roomId);
  }
}

