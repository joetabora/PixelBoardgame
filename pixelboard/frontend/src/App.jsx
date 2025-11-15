import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import PixelGrid from "./components/PixelGrid.jsx";
import ColorPalette from "./components/ColorPalette.jsx";
import ControlPanel from "./components/ControlPanel.jsx";
import StatusBar from "./components/StatusBar.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import Leaderboard from "./components/Leaderboard.jsx";
import HowToPlayModal from "./components/HowToPlayModal.jsx";
import PixlnaryUI from "./components/PixlnaryUI.jsx";

const DEFAULT_BOARD_SIZE = 50;
const PALETTE = [
  "#141414",
  "#ffffff",
  "#ff3864",
  "#f9c846",
  "#5aff3d",
  "#00f5d4",
  "#433cde",
  "#ff5cf4",
  "#ffa3ff",
  "#f46036"
];

const createGrid = (size = DEFAULT_BOARD_SIZE, fill = null) =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => fill));

function App() {
  const [board, setBoard] = useState(createGrid(DEFAULT_BOARD_SIZE));
  const [boardOwners, setBoardOwners] = useState(createGrid(DEFAULT_BOARD_SIZE));
  const [boardSize, setBoardSize] = useState(DEFAULT_BOARD_SIZE);
  const [selectedColor, setSelectedColor] = useState(PALETTE[2]);
  const [isConnected, setIsConnected] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [leaderboard, setLeaderboard] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 900);
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [chatHeight, setChatHeight] = useState(280);
  const [isHowToVisible, setIsHowToVisible] = useState(false);
  // Pixlnary game state
  const [role, setRole] = useState("spectator");
  const [secretWord, setSecretWord] = useState(null);
  const [timer, setTimer] = useState(null);
  const [isRoundActive, setIsRoundActive] = useState(false);
  const socketRef = useRef(null);
  const canvasRef = useRef(null);
  const pixelGridRef = useRef(null);
  const audioPoolRef = useRef([]);
  const boardSizeRef = useRef(DEFAULT_BOARD_SIZE);

  const socketUrl = useMemo(
    () => import.meta.env.VITE_SOCKET_URL || "http://localhost:4000",
    []
  );

  const blipUrl = useMemo(
    () => new URL("/sounds/blip.wav", import.meta.url).href,
    []
  );

  useEffect(() => {
    const onResize = () => {
      setIsDesktop(window.innerWidth >= 900);
    };
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const primaryClip = new Audio(blipUrl);
    primaryClip.volume = 0.28;
    primaryClip.preload = "auto";
    audioPoolRef.current = [primaryClip];

    return () => {
      audioPoolRef.current.forEach((clip) => {
        clip.pause();
      });
      audioPoolRef.current = [];
    };
  }, [blipUrl]);

  useEffect(() => {
    boardSizeRef.current = boardSize;
  }, [boardSize]);

  const playBlip = useCallback(() => {
    const pool = audioPoolRef.current;
    if (!pool.length) return;

    const reusable = pool.find((clip) => clip.paused);
    const clip = reusable || pool[0].cloneNode();
    clip.volume = 0.28;
    if (!reusable) {
      clip.preload = "auto";
      pool.push(clip);
    }
    try {
      clip.currentTime = 0;
    } catch (error) {
      // Some browsers block setting currentTime before metadata is loaded.
    }
    clip.play().catch(() => {
      /* Playback can be blocked until the first user interaction; safely ignore. */
    });
  }, []);

  // Establish Socket.io connection once on mount
  useEffect(() => {
    const socket = io(socketUrl, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      // Join game when connected
      socket.emit("joinGame");
    });
    socket.on("disconnect", () => setIsConnected(false));

    // Pixlnary game events
    socket.on("assignRole", ({ role: assignedRole }) => {
      setRole(assignedRole);
    });

    socket.on("secretWord", ({ word }) => {
      console.log(`[Client] Received secret word: ${word}`);
      setSecretWord(word);
    });

    socket.on("timerUpdate", ({ time }) => {
      setTimer(time);
    });

    socket.on("roundStart", () => {
      console.log(`[Client] Round started`);
      setIsRoundActive(true);
      // Don't clear secret word here - it might already be set or arriving soon
    });

    socket.on("roundWon", () => {
      setIsRoundActive(false);
    });

    socket.on("roundFailed", () => {
      setIsRoundActive(false);
    });

    socket.on(
      "board_state",
      ({
        board: incomingBoard,
        owners: incomingOwners,
        size,
        userId: incomingUserId,
        username: incomingUsername,
        count,
        leaderboard: incomingLeaderboard
      }) => {
        const resolvedSize =
          Number.isInteger(size) && size > 0 ? size : incomingBoard?.length ?? boardSizeRef.current;
        setBoardSize(resolvedSize);
        boardSizeRef.current = resolvedSize;

        const nextBoard =
          Array.isArray(incomingBoard) && incomingBoard.length === resolvedSize
            ? incomingBoard.map((row) => row.slice(0, resolvedSize))
            : createGrid(resolvedSize);
        setBoard(nextBoard);

        const nextOwners =
          Array.isArray(incomingOwners) && incomingOwners.length === resolvedSize
            ? incomingOwners.map((row) => row.slice(0, resolvedSize))
            : createGrid(resolvedSize);
        setBoardOwners(nextOwners);

        if (incomingUserId) setUserId(incomingUserId);
        if (incomingUsername) setUsername(incomingUsername);
        if (typeof count === "number") setUserCount(count);
        if (Array.isArray(incomingLeaderboard)) setLeaderboard(incomingLeaderboard);
      }
    );

    socket.on("pixel_updated", ({ x, y, color, owner }) => {
      const size = boardSizeRef.current;
      if (
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        x < 0 ||
        y < 0 ||
        x >= size ||
        y >= size
      ) {
        return;
      }

      setBoard((prev) => {
        if (!prev[y] || prev[y][x] === color) return prev;
        const next = prev.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((cell, cellIndex) => (cellIndex === x ? color : cell))
            : row
        );
        return next;
      });

      setBoardOwners((prev) => {
        if (!prev[y]) return prev;
        const next = prev.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((cellOwner, cellIndex) => (cellIndex === x ? owner ?? null : cellOwner))
            : row
        );
        return next;
      });

      if (color) {
        pixelGridRef.current?.burstAt(x, y, color);
        playBlip();
      }
    });

    socket.on("user_count", ({ count }) => {
      if (typeof count === "number") setUserCount(count);
    });

    socket.on("board_cleared", () => {
      const size = boardSizeRef.current;
      setBoard(createGrid(size));
      setBoardOwners(createGrid(size));
    });

    socket.on("chat_message", (payload) => {
      setChatMessages((prev) => [...prev.slice(-99), payload]);
    });

    socket.on("error_message", ({ message }) => {
      if (message) {
        window.alert(message);
      }
    });

    socket.on("leaderboard", ({ leaderboard: latest }) => {
      if (Array.isArray(latest)) {
        setLeaderboard(latest);
      }
    });

    socket.on("username_updated", ({ username: updated }) => {
      if (updated) {
        setUsername(updated);
      }
    });

    socket.on("user_renamed", ({ previous, username: renamed }) => {
      if (!renamed) return;
      setChatMessages((prev) => [
        ...prev.slice(-99),
        {
          username: "System",
          message: previous ? `${previous} is now ${renamed}` : `${renamed} joined`,
          timestamp: Date.now()
        }
      ]);
      setBoardOwners((prev) =>
        prev.map((row) => row.map((owner) => (owner === previous ? renamed : owner)))
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [socketUrl, playBlip]);

  // Keep an off-screen canvas in sync for PNG downloads
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const size = board.length || DEFAULT_BOARD_SIZE;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    board.forEach((row, y) => {
      row.forEach((color, x) => {
        if (!color) return;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      });
    });
  }, [board]);

  const handlePaint = useCallback(
    (x, y) => {
      // Only drawer can paint during active round
      if (isRoundActive && role !== "drawer") {
        return;
      }
      if (!socketRef.current) return;
      const color = selectedColor;
      socketRef.current.emit("paint_pixel", { x, y, color });

      // Optimistic local update so the pixel changes instantly
      setBoard((prev) => {
        if (!prev[y] || prev[y][x] === color) return prev;
        const next = prev.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((cell, cellIndex) => (cellIndex === x ? color : cell))
            : row
        );
        return next;
      });

      setBoardOwners((prev) => {
        if (!prev[y]) return prev;
        const next = prev.map((row, rowIndex) =>
          rowIndex === y
            ? row.map((cellOwner, cellIndex) => (cellIndex === x ? username : cellOwner))
            : row
        );
        return next;
      });
    },
    [selectedColor, username, isRoundActive, role]
  );

  const handleGuess = useCallback(
    (guess) => {
      if (!socketRef.current || role !== "guesser" || !isRoundActive) return;
      socketRef.current.emit("guessAttempt", { guess });
    },
    [role, isRoundActive]
  );

  const handleClear = useCallback(() => {
    socketRef.current?.emit("clear_board");
  }, []);

  const handleUndo = useCallback(() => {
    socketRef.current?.emit("undo_pixel");
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `pixlnary-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  const handleSendChat = useCallback(
    (message) => {
      if (!socketRef.current || !username) return;
      socketRef.current.emit("chat_message", { message, username });
    },
    [username]
  );

  const handleRename = useCallback((nextName) => {
    if (!socketRef.current) return;
    socketRef.current.emit("change_username", { username: nextName });
  }, []);

  const startResize = useCallback(
    (mode) => (event) => {
      if ((mode === "vertical" && !isDesktop) || (mode === "horizontal" && isDesktop)) {
        return;
      }
      event.preventDefault();

      const startCoord = mode === "vertical" ? event.clientX : event.clientY;
      const initialSize = mode === "vertical" ? sidebarWidth : chatHeight;

      const handlePointerMove = (moveEvent) => {
        const currentCoord = mode === "vertical" ? moveEvent.clientX : moveEvent.clientY;
        const delta = currentCoord - startCoord;
        const tentativeSize = initialSize + delta;

        if (mode === "vertical") {
          setSidebarWidth(Math.min(Math.max(tentativeSize, 240), 520));
        } else {
          setChatHeight(Math.min(Math.max(tentativeSize, 220), 520));
        }
      };

      const handlePointerUp = () => {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", handlePointerUp);
      };

      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", handlePointerUp);
    },
    [isDesktop, sidebarWidth, chatHeight]
  );

  const mainStyle = isDesktop
    ? { gridTemplateColumns: `minmax(0, 1fr) 12px ${Math.round(sidebarWidth)}px` }
    : undefined;
  const chatWrapperStyle = isDesktop ? undefined : { height: `${Math.round(chatHeight)}px` };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-content">
          <h1>Pixlnary</h1>
          <button
            type="button"
            className="action-btn howto-btn"
            onClick={() => setIsHowToVisible(true)}
          >
            How to Play
          </button>
        </div>
        <StatusBar
          isConnected={isConnected}
          userCount={userCount}
          userId={userId}
          username={username}
        />
      </header>

      <main className={`app-main ${isDesktop ? "layout-desktop" : "layout-mobile"}`} style={mainStyle}>
        <section className="canvas-section">
          <PixlnaryUI
            role={role}
            secretWord={secretWord}
            timer={timer}
            isRoundActive={isRoundActive}
            onGuess={handleGuess}
            socket={socketRef.current}
          />
          <PixelGrid
            ref={pixelGridRef}
            board={board}
            owners={boardOwners}
            onPaint={handlePaint}
            canDraw={!isRoundActive || role === "drawer"}
          />
        </section>

        {isDesktop ? (
          <div
            className="sidebar-resizer vertical"
            role="separator"
            aria-label="Resize sidebar"
            onPointerDown={startResize("vertical")}
          />
        ) : null}

        <aside className="sidebar">
          <ColorPalette
            palette={PALETTE}
            selectedColor={selectedColor}
            onSelectColor={setSelectedColor}
          />

          <ControlPanel
            username={username}
            onRename={handleRename}
            onUndo={handleUndo}
            onClear={handleClear}
            onDownload={handleDownload}
          />

          <Leaderboard entries={leaderboard} currentUsername={username} />

          <div className="chat-wrapper" style={chatWrapperStyle}>
            <ChatPanel
              username={username}
              messages={chatMessages}
              onSend={handleSendChat}
              isConnected={isConnected}
              style={{ flex: 1 }}
            />
            {!isDesktop ? (
              <div
                className="sidebar-resizer horizontal"
                role="separator"
                aria-label="Resize chat"
                onPointerDown={startResize("horizontal")}
              />
            ) : null}
          </div>
        </aside>
      </main>

      <footer className="app-footer">
        <p>Draw and guess in this multiplayer pixel art game!</p>
      </footer>

      <canvas ref={canvasRef} className="download-canvas" aria-hidden="true" />
      <HowToPlayModal
        isOpen={isHowToVisible}
        onClose={() => setIsHowToVisible(false)}
      />
    </div>
  );
}

export default App;

