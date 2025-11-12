import { useEffect, useState } from "react";

const ControlPanel = ({ username, onRename, onUndo, onClear, onDownload }) => {
  const [draft, setDraft] = useState(username || "");

  useEffect(() => {
    setDraft(username || "");
  }, [username]);

  const handleRename = (event) => {
    event.preventDefault();
    const nextName = draft.trim();
    if (!nextName || nextName === username) {
      return;
    }
    onRename?.(nextName);
  };

  return (
    <section className="panel control-panel">
      <h2>Controls</h2>
      <p className="control-copy">
        Smash a button to rewind your move, wipe the slate, or snag a screenshot.
      </p>
      <form className="control-group rename-form" onSubmit={handleRename}>
        <label className="rename-label" htmlFor="rename-input">
          Player Handle
        </label>
        <div className="rename-row">
          <input
            id="rename-input"
            className="rename-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            maxLength={20}
            autoComplete="off"
            spellCheck="false"
            placeholder="Enter a neon alias"
          />
          <button
            type="submit"
            className="action-btn rename-btn"
            disabled={!draft.trim() || draft.trim() === username}
          >
            Update
          </button>
        </div>
        <p className="rename-hint">1–20 characters. Neon vibes only.</p>
      </form>
      <div className="control-group buttons">
        <button className="action-btn undo" onClick={onUndo}>
          Undo Pixel
        </button>
        <button className="action-btn clear" onClick={onClear}>
          Clear Board
        </button>
        <button className="action-btn download" onClick={onDownload}>
          Download PNG
        </button>
      </div>
    </section>
  );
};

export default ControlPanel;

