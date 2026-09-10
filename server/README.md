# EMBERFALL Netplay Server

WebSocket relay server for multiplayer co-op.

## Running Locally

```bash
cd server
npm install
npm start
```

The server runs on port 8787 by default (or `$PORT` environment variable).

## Running in GitHub Codespaces

1. Open this repository in Codespaces
2. The server will run on port 8787
3. Share the URL with players to connect

### Codespaces Configuration

A `.devcontainer/devcontainer.json` is provided for easy setup.

## Connecting from the Game

Once the server is running, players can:
1. Host: Click "Host a World" in the game
2. Join: Enter the room code shown by the host

The server handles room creation and message relay between players.
