const HowToPlayModal = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="howto-overlay" role="dialog" aria-modal="true" aria-label="How to Play">
      <div className="howto-backdrop" onClick={onClose} />
      <div className="howto-modal">
        <header className="howto-header">
          <h2>How to Play</h2>
          <button type="button" className="action-btn close-btn" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="howto-content">
          <section>
            <h3>Painting Pixels</h3>
            <p>
              Choose a color from the palette and click or drag across the grid to drop pixels.
              Every stroke appears instantly for all connected players.
            </p>
          </section>

          <section>
            <h3>Undo &amp; Clear</h3>
            <p>
              Hit <strong>Undo Pixel</strong> to rewind your most recent stroke, or{" "}
              <strong>Clear Board</strong> to reset the entire canvas for every player.
            </p>
          </section>

          <section>
            <h3>Color Palette</h3>
            <p>
              Tap any swatch to arm that neon shade. The active palette slot glows so you can
              keep the arcade vibes pumping.
            </p>
          </section>

          <section>
            <h3>Chat &amp; Usernames</h3>
            <p>
              Use chat to coordinate color schemes or celebrate art drops. Rename yourself in
              the control panel to broadcast a custom handle, and watch for chat pings and
              neon toasts when players rebrand.
            </p>
          </section>

          <section>
            <h3>Leaderboard</h3>
            <p>
              The leaderboard tracks total pixels painted per player. Climb the rankings to
              earn the top neon glow and bragging rights. Undoing a pixel removes it from
              your tally.
            </p>
          </section>

          <section>
            <h3>Particles &amp; Sounds</h3>
            <p>
              Every stroke triggers 8-bit inspired blips and neon particle bursts. Chat and
              special events sprinkle in extra visual flair—turn up your speakers for the
              full arcade ambience.
            </p>
          </section>

          <section>
            <h3>Mini-Game Events</h3>
            <p>
              Time-limited paint challenges and milestone celebrations pop up periodically.
              Keep an eye on the board and leaderboard—bonus particles and sounds cue when
              events kick off or a player hits a new high score.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default HowToPlayModal;


