// ============================================================
//  EMBERFALL netplay relay server
//  Room-based WebSocket relay. The HOST is authoritative:
//  clients send inputs, host sends full world snapshots.
//  Zero game logic here — pure message routing.
// ============================================================
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import {
  createParty,
  joinParty,
  leaveParty,
  kickMember,
  transferLeadership,
  updatePartySettings,
  getParty,
  getPlayerParty,
  getAllParties,
} from './parties.mjs';
import {
  startSession,
  updateSession,
  endSession,
  getPlayerSummary,
  getLeaderboard,
  getActiveSessions,
  getRecentSessions,
  CATEGORIES,
} from './leaderboard.mjs';

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

// Party to room mapping
const partyRooms = new Map(); // partyId -> roomCode

function getRoomByPartyId(partyId) {
  const roomCode = partyRooms.get(partyId);
  return roomCode ? rooms.get(roomCode) : null;
}

function getWsByPlayerId(playerId) {
  for (const [ws] of rooms.entries()) {
    if (ws.playerId === playerId) return ws;
  }
  return null;
}

function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = { host: null, clients: new Map(), created: Date.now() };
    rooms.set(code, room);
  }
  return room;
}

// Player info storage
const players = new Map(); // ws -> { id, name }
let playerIdCounter = 0;

function generatePlayerId() {
  return 'P' + String(++playerIdCounter).padStart(5, '0');
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
        
        // If player is in a party, associate the room with the party
        if (ws.playerId) {
          const party = getPlayerParty(ws.playerId);
          if (party) {
            partyRooms.set(party.id, code);
          }
        }
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
        
        // If player is in a party, associate the room with the party
        if (ws.playerId) {
          const party = getPlayerParty(ws.playerId);
          if (party) {
            partyRooms.set(party.id, code);
          }
        }
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
      
      // --- Party commands ---
      case "party_create": {
        const playerId = generatePlayerId();
        players.set(ws, { id: playerId, name: msg.name || 'Player' });
        ws.playerId = playerId;
        
        const party = createParty(playerId, msg.name || 'Player', msg.partyName);
        ws.send(JSON.stringify({
          t: "party_created",
          partyId: party.id,
          party
        }));
        break;
      }
      
      case "party_join": {
        const playerId = ws.playerId || generatePlayerId();
        if (!ws.playerId) {
          players.set(ws, { id: playerId, name: msg.playerName || 'Player' });
          ws.playerId = playerId;
        }
        
        const result = joinParty(playerId, msg.playerName || 'Player', msg.partyId);
        ws.send(JSON.stringify({
          t: result.success ? "party_joined" : "party_error",
          ...result
        }));
        
        // Notify other party members
        if (result.success && result.party) {
          relayTo(getRoomByPartyId(msg.partyId), {
            t: "party_member_joined",
            member: { id: playerId, name: msg.playerName || 'Player' }
          }, ws);
        }
        break;
      }
      
      case "party_leave": {
        const playerId = ws.playerId;
        if (!playerId) {
          ws.send(JSON.stringify({ t: "party_error", success: false, error: "Not in a party" }));
          break;
        }
        
        const result = leaveParty(playerId);
        ws.send(JSON.stringify({
          t: result.success ? "party_left" : "party_error",
          ...result
        }));
        
        // Notify other party members
        if (result.success && result.party) {
          relayTo(getRoomByPartyId(result.party.id), {
            t: "party_member_left",
            memberId: playerId
          }, ws);
        }
        break;
      }
      
      case "party_kick": {
        const playerId = ws.playerId;
        if (!playerId) {
          ws.send(JSON.stringify({ t: "party_error", success: false, error: "Not in a party" }));
          break;
        }
        
        const result = kickMember(playerId, msg.targetId);
        ws.send(JSON.stringify({
          t: result.success ? "member_kicked" : "party_error",
          ...result
        }));
        
        // Notify kicked member
        if (result.success) {
          const targetWs = getWsByPlayerId(msg.targetId);
          if (targetWs) {
            targetWs.send(JSON.stringify({
              t: "member_kicked",
              kickedBy: playerId
            }));
          }
        }
        break;
      }
      
      case "party_transfer": {
        const playerId = ws.playerId;
        if (!playerId) {
          ws.send(JSON.stringify({ t: "party_error", success: false, error: "Not in a party" }));
          break;
        }
        
        const result = transferLeadership(playerId, msg.newLeaderId);
        ws.send(JSON.stringify({
          t: result.success ? "leadership_transfer" : "party_error",
          ...result
        }));
        break;
      }
      
      case "party_settings": {
        const playerId = ws.playerId;
        if (!playerId) {
          ws.send(JSON.stringify({ t: "party_error", success: false, error: "Not in a party" }));
          break;
        }
        
        const result = updatePartySettings(playerId, msg.settings);
        ws.send(JSON.stringify({
          t: result.success ? "party_settings_updated" : "party_error",
          ...result
        }));
        break;
      }
      
      case "party_list": {
        const parties = getAllParties();
        ws.send(JSON.stringify({
          t: "party_list",
          parties
        }));
        break;
      }
      
      case "party_info": {
        const party = getParty(msg.partyId);
        if (party) {
          ws.send(JSON.stringify({
            t: "party_info",
            party
          }));
        } else {
          ws.send(JSON.stringify({
            t: "party_error",
            success: false,
            error: "Party not found"
          }));
        }
        break;
      }
      
      // --- Leaderboard commands ---
      case "leaderboard_get": {
        const category = msg.category || CATEGORIES.KILLS;
        const leaderboard = getLeaderboard(category, msg.limit || 10);
        ws.send(JSON.stringify({
          t: "leaderboard_data",
          category,
          leaderboard
        }));
        break;
      }
      
      case "player_stats": {
        const playerId = ws.playerId || msg.playerId;
        if (!playerId) {
          ws.send(JSON.stringify({ t: "stats_error", error: "Not logged in" }));
          break;
        }
        const summary = getPlayerSummary(playerId);
        ws.send(JSON.stringify({
          t: "player_stats",
          stats: summary
        }));
        break;
      }
      
      case "session_start": {
        const playerId = ws.playerId || generatePlayerId();
        if (!ws.playerId) {
          players.set(ws, { id: playerId, name: msg.playerName || 'Player' });
          ws.playerId = playerId;
        }
        const sessionId = startSession(playerId, msg.playerName || players.get(ws)?.name || 'Player');
        ws.sessionId = sessionId;
        ws.send(JSON.stringify({
          t: "session_started",
          sessionId
        }));
        break;
      }
      
      case "session_update": {
        if (ws.sessionId) {
          updateSession(ws.sessionId, msg);
        }
        break;
      }
      
      case "session_end": {
        if (ws.sessionId) {
          const session = endSession(ws.sessionId, msg.completed !== false);
          ws.send(JSON.stringify({
            t: "session_ended",
            session
          }));
          ws.sessionId = null;
        }
        break;
      }
      
      case "active_sessions": {
        const sessions = getActiveSessions(msg.limit || 10);
        ws.send(JSON.stringify({
          t: "active_sessions",
          sessions
        }));
        break;
      }
      
      case "recent_sessions": {
        const sessions = getRecentSessions(msg.limit || 20);
        ws.send(JSON.stringify({
          t: "recent_sessions",
          sessions
        }));
        break;
      }
    }
  });

  // Update session on disconnect
  ws.on("close", () => {
    // ... existing close logic ...
    
    // End session if active
    if (ws.sessionId) {
      endSession(ws.sessionId, false); // abandoned
    }
  });
}

  ws.on("close", () => {
    const room = ws.roomCode ? rooms.get(ws.roomCode) : null;
    if (!room) return;
    if (ws.isHost) { room.host = null; relayTo(room, { t: "hostLeft" }); }
    else {
      const info = room.clients.get(ws);
      room.clients.delete(ws);
      if (info) relayTo(room, { t: "peerLeft", name: info.name });
    }
    
    // Handle party leave on disconnect
    if (ws.playerId) {
      const party = getPlayerParty(ws.playerId);
      if (party) {
        // Notify party members
        const partyRoom = getRoomByPartyId(party.id);
        if (partyRoom) {
          relayTo(partyRoom, {
            t: "party_member_left",
            memberId: ws.playerId,
            reason: "disconnected"
          }, ws);
        }
        // Remove from party
        leaveParty(ws.playerId);
      }
      players.delete(ws);
    }
  });
});

server.listen(PORT, () => {
  console.log(`⚔  EMBERFALL netplay relay listening on port ${PORT}`);
});
