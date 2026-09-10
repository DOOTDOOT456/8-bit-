// ============================================================
//  EMBERFALL — Party System
//  Allows players to form groups/parties for co-op gameplay
// ============================================================

/**
 * Party data structure:
 * {
 *   id: string,           // Unique party ID (6 chars)
 *   name: string,         // Party name (chosen by leader)
 *   leader: string,       // Player ID of party leader
 *   members: [           // Array of party members
 *     {
 *       id: string,      // Player ID
 *       name: string,    // Player name
 *       joinedAt: number // Timestamp
 *     }
 *   ],
 *   created: number,      // Creation timestamp
 *   settings: {           // Party settings
 *     public: boolean,   // Can others join?
 *     maxMembers: number // Max party size (default 4)
 *   }
 * }
 */

const PARTIES = new Map(); // partyId -> party object
const PLAYER_PARTY = new Map(); // playerId -> partyId

// Party ID generation (6 character alphanumeric)
function generatePartyId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  // Ensure uniqueness
  if (PARTIES.has(id)) return generatePartyId();
  return id;
}

// Create a new party
export function createParty(leaderId, leaderName, partyName = null) {
  const partyId = generatePartyId();
  const party = {
    id: partyId,
    name: partyName || `${leaderName}'s Party`,
    leader: leaderId,
    members: [{
      id: leaderId,
      name: leaderName,
      joinedAt: Date.now()
    }],
    created: Date.now(),
    settings: {
      public: true,
      maxMembers: 4
    }
  };
  
  PARTIES.set(partyId, party);
  PLAYER_PARTY.set(leaderId, partyId);
  
  return party;
}

// Join an existing party
export function joinParty(playerId, playerName, partyId) {
  const party = PARTIES.get(partyId);
  if (!party) return { success: false, error: 'Party not found' };
  
  if (party.members.length >= party.settings.maxMembers) {
    return { success: false, error: 'Party is full' };
  }
  
  if (PLAYER_PARTY.has(playerId)) {
    return { success: false, error: 'Player is already in a party' };
  }
  
  party.members.push({
    id: playerId,
    name: playerName,
    joinedAt: Date.now()
  });
  
  PLAYER_PARTY.set(playerId, partyId);
  
  return { success: true, party };
}

// Leave current party
export function leaveParty(playerId) {
  const partyId = PLAYER_PARTY.get(playerId);
  if (!partyId) return { success: false, error: 'Player is not in a party' };
  
  const party = PARTIES.get(partyId);
  if (!party) return { success: false, error: 'Party not found' };
  
  // Remove player from party
  party.members = party.members.filter(m => m.id !== playerId);
  PLAYER_PARTY.delete(playerId);
  
  // If leader left, transfer leadership or disband
  if (party.leader === playerId) {
    if (party.members.length > 0) {
      // Transfer leadership to first member
      party.leader = party.members[0].id;
    } else {
      // Party is now empty, disband it
      PARTIES.delete(partyId);
      return { success: true, disbanded: true };
    }
  }
  
  return { success: true, party };
}

// Kick a member from the party (leader only)
export function kickMember(leaderId, targetId) {
  const partyId = PLAYER_PARTY.get(leaderId);
  if (!partyId) return { success: false, error: 'Player is not in a party' };
  
  const party = PARTIES.get(partyId);
  if (!party) return { success: false, error: 'Party not found' };
  
  if (party.leader !== leaderId) {
    return { success: false, error: 'Only the party leader can kick members' };
  }
  
  if (leaderId === targetId) {
    return { success: false, error: 'You cannot kick yourself' };
  }
  
  const member = party.members.find(m => m.id === targetId);
  if (!member) {
    return { success: false, error: 'Target player is not in your party' };
  }
  
  party.members = party.members.filter(m => m.id !== targetId);
  PLAYER_PARTY.delete(targetId);
  
  return { success: true, party };
}

// Transfer leadership
export function transferLeadership(leaderId, newLeaderId) {
  const partyId = PLAYER_PARTY.get(leaderId);
  if (!partyId) return { success: false, error: 'Player is not in a party' };
  
  const party = PARTIES.get(partyId);
  if (!party) return { success: false, error: 'Party not found' };
  
  if (party.leader !== leaderId) {
    return { success: false, error: 'Only the party leader can transfer leadership' };
  }
  
  const newLeader = party.members.find(m => m.id === newLeaderId);
  if (!newLeader) {
    return { success: false, error: 'Target player is not in your party' };
  }
  
  party.leader = newLeaderId;
  
  return { success: true, party };
}

// Update party settings (leader only)
export function updatePartySettings(leaderId, settings) {
  const partyId = PLAYER_PARTY.get(leaderId);
  if (!partyId) return { success: false, error: 'Player is not in a party' };
  
  const party = PARTIES.get(partyId);
  if (!party) return { success: false, error: 'Party not found' };
  
  if (party.leader !== leaderId) {
    return { success: false, error: 'Only the party leader can update settings' };
  }
  
  if (settings.public !== undefined) {
    party.settings.public = settings.public;
  }
  if (settings.maxMembers !== undefined) {
    party.settings.maxMembers = Math.max(2, Math.min(8, settings.maxMembers));
  }
  if (settings.name !== undefined) {
    party.name = settings.name;
  }
  
  return { success: true, party };
}

// Get party by ID
export function getParty(partyId) {
  return PARTIES.get(partyId);
}

// Get player's party
export function getPlayerParty(playerId) {
  const partyId = PLAYER_PARTY.get(playerId);
  if (!partyId) return null;
  return PARTIES.get(partyId);
}

// Get all parties (for list/ browse)
export function getAllParties() {
  const parties = [];
  for (const party of PARTIES.values()) {
    if (party.settings.public) {
      parties.push({
        id: party.id,
        name: party.name,
        leader: party.leader,
        memberCount: party.members.length,
        maxMembers: party.settings.maxMembers,
        created: party.created
      });
    }
  }
  return parties;
}

// Cleanup: remove empty parties older than 1 hour
export function cleanupParties() {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  
  for (const [partyId, party] of PARTIES.entries()) {
    if (party.members.length === 0 && (now - party.created) > ONE_HOUR) {
      PARTIES.delete(partyId);
    }
  }
}

// Periodic cleanup (every 30 minutes)
setInterval(cleanupParties, 30 * 60 * 1000);
