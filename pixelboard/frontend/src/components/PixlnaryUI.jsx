import { useState, useEffect, useCallback } from "react";

const PixlnaryUI = ({
  role,
  secretWord,
  timer,
  isRoundActive,
  onGuess,
  socket
}) => {
  const [guessInput, setGuessInput] = useState("");
  const [roundWon, setRoundWon] = useState(false);
  const [roundFailed, setRoundFailed] = useState(false);
  const [wonWord, setWonWord] = useState(null);

  // Listen for round events
  useEffect(() => {
    if (!socket) return;

    const handleRoundWon = ({ word }) => {
      setRoundWon(true);
      setRoundFailed(false);
      setWonWord(word);
      setGuessInput("");
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setRoundWon(false);
      }, 5000);
    };

    const handleRoundFailed = ({ word }) => {
      setRoundFailed(true);
      setRoundWon(false);
      setWonWord(word);
      setGuessInput("");
      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        setRoundFailed(false);
      }, 5000);
    };

    const handleRoundStart = () => {
      setRoundWon(false);
      setRoundFailed(false);
      setWonWord(null);
      setGuessInput("");
    };

    socket.on("roundWon", handleRoundWon);
    socket.on("roundFailed", handleRoundFailed);
    socket.on("roundStart", handleRoundStart);

    return () => {
      socket.off("roundWon", handleRoundWon);
      socket.off("roundFailed", handleRoundFailed);
      socket.off("roundStart", handleRoundStart);
    };
  }, [socket]);

  const handleGuessSubmit = useCallback(
    (e) => {
      e.preventDefault();
      const trimmed = guessInput.trim();
      if (!trimmed || !isRoundActive || role !== "guesser") {
        return;
      }
      onGuess(trimmed);
      setGuessInput("");
    },
    [guessInput, isRoundActive, role, onGuess]
  );

  return (
    <div className="pixlnary-ui">
      {/* Timer Display - Top Center */}
      {isRoundActive && timer !== null && (
        <div className="pixlnary-timer">
          <div className={`timer-display ${timer <= 10 ? "timer-warning" : ""}`}>
            {timer}s
          </div>
        </div>
      )}

      {/* Role and Word Display */}
      <div className="pixlnary-info">
        {role === "drawer" && (
          <div className="role-display drawer-role">
            <span className="role-label">You are drawing:</span>
            <span className="secret-word">{secretWord || "Waiting..."}</span>
          </div>
        )}

        {role === "guesser" && (
          <div className="role-display guesser-role">
            <span className="role-label">You are guessing</span>
            <form className="guess-form" onSubmit={handleGuessSubmit}>
              <input
                type="text"
                className="guess-input"
                value={guessInput}
                onChange={(e) => setGuessInput(e.target.value)}
                placeholder="Type your guess..."
                disabled={!isRoundActive}
                maxLength={50}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="submit"
                className="action-btn guess-btn"
                disabled={!isRoundActive || !guessInput.trim()}
              >
                Guess
              </button>
            </form>
          </div>
        )}

        {role === "spectator" && (
          <div className="role-display spectator-role">
            <span className="role-label">You are spectating</span>
          </div>
        )}
      </div>

      {/* Overlays */}
      {roundWon && (
        <div
          className="pixlnary-overlay overlay-won"
          onClick={() => setRoundWon(false)}
        >
          <div className="overlay-content">
            <h2>Correct!</h2>
            <p>The word was: {wonWord}</p>
            <p style={{ fontSize: "0.65rem", marginTop: "0.5rem", opacity: 0.7 }}>
              Click to dismiss
            </p>
          </div>
        </div>
      )}

      {roundFailed && (
        <div
          className="pixlnary-overlay overlay-failed"
          onClick={() => setRoundFailed(false)}
        >
          <div className="overlay-content">
            <h2>Time's up!</h2>
            <p>The word was: {wonWord}</p>
            <p style={{ fontSize: "0.65rem", marginTop: "0.5rem", opacity: 0.7 }}>
              Click to dismiss
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PixlnaryUI;

