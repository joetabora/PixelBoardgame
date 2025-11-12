const StatusBar = ({ isConnected, userCount, userId, username }) => {
  return (
    <div className="status-bar">
      <span className={`status-pill ${isConnected ? "online" : "offline"}`}>
        {isConnected ? "Connected" : "Disconnected"}
      </span>
      <span className="status-item">Users Online: {userCount}</span>
      {username ? (
        <span className="status-item">Logged in as {username}</span>
      ) : userId ? (
        <span className="status-item">You are User #{userId}</span>
      ) : null}
    </div>
  );
};

export default StatusBar;

