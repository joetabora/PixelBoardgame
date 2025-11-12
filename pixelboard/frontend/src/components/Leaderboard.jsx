/**
 * Leaderboard displays the top players by painted pixels.
 */
const Leaderboard = ({ entries, currentUsername }) => {
  if (!entries || entries.length === 0) {
    return (
      <section className="panel leaderboard-panel">
        <h2>Leaderboard</h2>
        <p className="leaderboard-empty">Paint your first pixel to claim the top spot!</p>
      </section>
    );
  }

  return (
    <section className="panel leaderboard-panel">
      <h2>Leaderboard</h2>
      <ol className="leaderboard-list">
        {entries.map(({ username, count }) => {
          const isYou = username === currentUsername;
          return (
            <li key={`${username}-${count}`} className={isYou ? "leaderboard-entry you" : "leaderboard-entry"}>
              <span className="leaderboard-name">{isYou ? `${username} (You)` : username}</span>
              <span className="leaderboard-score">{count}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
};

export default Leaderboard;


