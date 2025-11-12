import { useEffect, useRef, useState } from "react";

/**
 * ChatPanel renders a retro-styled chat feed with an input box.
 * Messages auto-scroll to the latest entry when new chat arrives.
 */
const ChatPanel = ({ username, messages, onSend, isConnected, style }) => {
  const [draft, setDraft] = useState("");
  const messagesRef = useRef(null);

  useEffect(() => {
    const container = messagesRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <section className="panel chat-panel" style={style}>
      <h2>Chat</h2>
      <div ref={messagesRef} className="chat-messages">
        {messages.length === 0 ? (
          <p className="chat-empty">Be the first to drop a neon hello!</p>
        ) : (
          messages.map((entry) => {
            const displayName = entry.username || entry.user || "Player";
            return (
              <div key={`${entry.timestamp}-${displayName}`} className="chat-message">
                <span className="chat-user">{displayName}</span>
                <span className="chat-text">{entry.message}</span>
              </div>
            );
          })
        )}
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={
            isConnected
              ? `Chat as ${username || "..."}`.trim()
              : "Connecting..."
          }
          maxLength={280}
          disabled={!isConnected}
          aria-label="Send a chat message"
        />
        <button type="submit" className="action-btn chat-send" disabled={!isConnected}>
          Send
        </button>
      </form>
    </section>
  );
};

export default ChatPanel;

