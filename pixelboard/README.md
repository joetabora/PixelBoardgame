# Pixlnary

Pixlnary is a real-time, multiplayer drawing and guessing game. One player draws a secret word while others try to guess it before time runs out!

## Features

- 50×50 pixel grid with neon 8-bit styling and hover feedback
- Live updates powered by Socket.io (Express backend + React frontend)
- Retro color palette with pixel-perfect rendering
- Audio and particle feedback every time a pixel lights up
- Board controls: undo your last pixel, clear canvas, download current artwork as PNG
- Personalise your handle from the control panel at any time
- Resizable neon sidebar with live leaderboard and chat
- Hover tooltips show who placed each pixel in real time
- Real-time chat with arcade styling, auto-scroll, and per-player handles
- Live leaderboard tracking pixels painted per player
- User presence counter and personalised handle (e.g. `Player #7`)
- Responsive layout optimized for desktop and mobile

## Tech Stack

- **Frontend:** React + Vite, Socket.io client, CSS styling
- **Backend:** Node.js, Express, Socket.io server
- **State Persistence:** In-memory board that resets on server restart

## Getting Started

Clone the repository and set up the backend and frontend projects separately.

```bash
git clone <your-repo-url>
cd pixlnary
```

### Backend

```bash
cd backend
npm install
npm start
```

The backend runs on port `4000` by default. To customize, create a `.env` file in `backend/` and set:

```
PORT=5000
```

### Frontend

Open a new terminal window/tab:

```bash
cd pixlnary/frontend
npm install
npm run dev
```

Vite serves the frontend on port `5173`. The app expects the backend at `http://localhost:4000`. If the backend runs elsewhere, create a `.env` file in `frontend/` and set:

```
VITE_SOCKET_URL=http://localhost:5000
```

## Usage

1. Launch the backend server.
2. Start the frontend dev server and open the provided URL (usually `http://localhost:5173`).
3. Select a color, click or drag across the grid to paint. Changes appear for everyone instantly.
4. Use the control panel to undo your last pixel, clear the board, or download artwork as a PNG.
5. Hang out in the chat panel to coordinate color schemes and shout out your creations.

## Development Notes

- Board state lives in-memory on the backend—restart the server to reset everything.
- Socket.io broadcasts keep all clients in sync for drawing, undoing, chatting, and clearing actions.
- Undo tracks only the most recent pixel per user for fast backtracking without history bloat.
- Styling focuses on an 8-bit aesthetic with pixel-perfect scaling and accessible controls.

## License

This project is provided as-is for demonstration purposes. Feel free to adapt it for your own needs.

