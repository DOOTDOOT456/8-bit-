# EMBERFALL Netplay Server

WebSocket relay server for multiplayer co-op with party system, leaderboards, and session tracking.

## Features

- 🏠 **Room-based matchmaking** — host or join game rooms with 4-character codes
- 👥 **Party system** — create/join parties, chat, whisper, manage members
- 📊 **Leaderboards** — track kills, depth, wins, XP, and survival stats
- 🎮 **Session tracking** — record game sessions for statistics
- 🔄 **Real-time relay** — host-authoritative gameplay, pure message routing

## Running Locally

```bash
cd server
npm install
npm start
```

The server runs on port 8787 by default (or `$PORT` environment variable).

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8787 | Server port |

## Running in GitHub Codespaces

1. Open this repository in Codespaces
2. The server will run on port 8787 automatically
3. Share the URL with players to connect

### Codespaces Configuration

A `.devcontainer/devcontainer.json` is provided for easy setup with:
- Node.js 18
- Port forwarding for 5173 (frontend) and 8787 (server)
- Automatic server dependency installation

## Connecting from the Game

Once the server is running, players can:

### Hosting a Game
1. Click "Host a World" in the game
2. Share the 4-character room code with friends
3. Party will be auto-created for the host

### Joining a Game
1. Click "Join World"
2. Enter the room code shown by the host
3. Start playing together!

### Using Parties
```
/party create [name]     - Create a new party
/party join [id]         - Join an existing party
/party leave             - Leave your current party
/party chat [message]    - Chat with party members
/party whisper [player]  - Send private message
```

The server handles:
- Room creation and management
- Party system with leadership
- Real-time message relay between players
- Player session tracking
- Leaderboard data collection
