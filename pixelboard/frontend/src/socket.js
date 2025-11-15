import { io } from "socket.io-client";

/**
 * Creates and returns a Socket.io client instance
 * Uses VITE_SERVER_URL from environment variables
 * Falls back to empty string in production (should be set in Vercel)
 */
export const createSocket = () => {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "";

  if (!serverUrl) {
    console.warn("VITE_SERVER_URL is not set. Socket connection may fail.");
  }

  const socket = io(serverUrl, {
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  return socket;
};

