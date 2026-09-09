// ============================================================
//  EMBERFALL netplay relay server
//  Room-based WebSocket relay. The HOST is authoritative:
//  clients send inputs, host sends full world snapshots.
//  Zero game logic here — pure message routing.
// ============================================================
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";

const PORT = process.env.PORT || 8787;

const server = createServer((req, res) => {
  // Health check endpoint
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", rooms: rooms.size, players: countPlayers() }));
});

const wss = new WebSocketServer({ server });

/** roomCode -> { host: ws, clients: Map<ws, {name}>, created } */
const rooms = new Map();
const ROOM_TTL = 2 * 60 * 60 * 1000; // clean empty rooms after 2h

function countPlayers() {
  let n = 0;
  for (const r of rooms.values()) n += 1 + r.clients.size;
  return n;
}

function makeCode() {
  // 4-char code, unambiguous alphabet
  const alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  return Array.from(randomBytes(4)).map(b => alphabet[b % alphabet.length]).join("");
}

function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = { host: null, clients: new Map(), created: Date.now() };
    rooms.set(code, room);
  }
  return room;
}

function roomState(room) {
  return {
    type: "room",
    hostConnected: !!room.host && room.host.readyState === 1,
    clients: [...room.clients.values()].map(c => c.name),
  };
}

function relayTo(room, msg, exceptWs = null) {
  const data = JSON.stringify(msg);
  if (room.host && room.host !== exceptWs && room.host.readyState === 1) room.host.send(data);
  for (const [ws] of room.clients) {
    if (ws !== exceptWs && ws.readyState === 1) ws.send(data);
  }
}

function cleanup() {
  const now = Date.now();
  for (const [code, room] of rooms) {
    const hostAlive = room.host && room.host.readyState === 1;
    const clientsAlive = [...room.clients.keys()].filter(ws => ws.readyState === 1);
    if (!hostAlive && clientsAlive.length === 0 && now - room.created > 60_000) {
      rooms.delete(code);
    } else {
      room.clients = new Map(clientsAlive.map(ws => [ws, room.clients.get(ws)]));
    }
  }
}
setInterval(cleanup, 30_000);

wss.on("connection", ws => {
  ws.roomCode = null;
  ws.isHost = false;

  ws.on("message", raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;

    switch (msg.t) {
      // --- join / host ---
      case "host": {
        let code = makeCode();
        while (rooms.has(code)) code = makeCode();
        const r = getOrCreateRoom(code);
        r.host = ws;
        ws.roomCode = code;
        ws.isHost = true;
        ws.send(JSON.stringify({ t: "hosted", code }));
        break;
      }
      case "join": {
        const code = String(msg.code || "").toUpperCase().trim();
        const r = rooms.get(code);
        if (!r) { ws.send(JSON.stringify({ t: "error", msg: "Room not found" })); return; }
        if (r.clients.has(ws)) { /* rejoin ok */ }
        else r.clients.set(ws, { name: msg.name || `Player ${r.clients.size + 2}` });
        ws.roomCode = code;
        ws.isHost = false;
        ws.send(JSON.stringify({ t: "joined", code, ...roomState(r) }));
        relayTo(r, { t: "peerJoined", name: r.clients.get(ws).name }, ws);
        break;
      }
      case "leave": {
        if (room) {
          if (ws.isHost) { room.host = null; relayTo(room, { t: "hostLeft" }); }
          else {
            const info = room.clients.get(ws);
            room.clients.delete(ws);
            if (info) relayTo(room, { t: "peerLeft", name: info.name });
          }
        }
        ws.roomCode = null;
        break;
      }

      // --- gameplay relay (host authoritative) ---
      case "input": {
        // client -> host
        if (room && room.host && room.host.readyState === 1) {
          room.host.send(JSON.stringify({ t: "input", id: msg.id, keys: msg.keys, aim: msg.aim }));
        }
        break;
      }
      case "state": {
        // host -> clients (full snapshot)
        if (ws.isHost && room) {
          for (const [client] of room.clients) {
            if (client.readyState === 1) client.send(raw.toString());
          }
        }
        break;
      }
      case "event": {
        // either side broadcast (toasts etc.)
        if (room) relayTo(room, msg, ws);
        break;
      }
      case "ping": ws.send(JSON.stringify({ t: "pong" })); break;
    }
  });

  ws.on("close", () => {
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;
    if (ws.isHost) { room.host = null; relayTo(room, { t: "hostLeft" }); }
    else {
      const info = room.clients.get(ws);
      room.clients.delete(ws);
      if (info) relayTo(room, { t: "peerLeft", name: info.name });
    }
  });
});

server.listen(PORT, () => {
  console.log(`⚔  EMBERFALL netplay relay listening on port ${PORT}`);
});
