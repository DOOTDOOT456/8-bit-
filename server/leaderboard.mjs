// ============================================================
//  EMBERFALL — Leaderboard System
//  Tracks player scores and achievements across servers
// ============================================================

const LEADERBOARD = {
  // High scores by category
  highScores: new Map(), // category -> [{ playerId, playerName, score, timestamp }]
  
  // Player statistics
  playerStats: new Map(), // playerId -> { gamesPlayed, wins, kills, deaths, bestDepth, totalXp, timestamp }
  
  // Session scores (temporary, per game session)
  sessions: new Map(), // sessionId -> { playerId, playerName, score, kills, deaths, depth, time, status }
};

// Leaderboard categories
export const CATEGORIES = {
  KILLS: 'kills',
  DEPTH: 'depth',
  WINS: 'wins',
  XP: 'xp',
  SURVIVAL: 'survival', // deaths to kills ratio
};

// Update player score in a category
export function updateScore(playerId, playerName, category, value) {
  const scores = LEADERBOARD.highScores.get(category) || [];
  
  // Find existing entry
  const existing = scores.find(s => s.playerId === playerId);
  
  if (existing) {
    // Update existing score
    existing.score += value;
    existing.timestamp = Date.now();
  } else {
    // Add new entry
    scores.push({
      playerId,
      playerName,
      score: value,
      timestamp: Date.now(),
    });
  }
  
  // Sort by score (descending) and keep top 100
  scores.sort((a, b) => b.score - a.score);
  if (scores.length > 100) scores.length = 100;
  
  LEADERBOARD.highScores.set(category, scores);
}

// Get leaderboard for a category
export function getLeaderboard(category, limit = 10) {
  const scores = LEADERBOARD.highScores.get(category) || [];
  return scores.slice(0, limit).map(s => ({
    rank: scores.indexOf(s) + 1,
    playerName: s.playerName,
    score: s.score,
    timestamp: s.timestamp,
  }));
}

// Update player statistics
export function updatePlayerStats(playerId, playerName, stats) {
  let player = LEADERBOARD.playerStats.get(playerId);
  
  if (!player) {
    player = {
      playerId,
      playerName,
      gamesPlayed: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      bestDepth: 0,
      totalXp: 0,
      timestamp: Date.now(),
    };
    LEADERBOARD.playerStats.set(playerId, player);
  }
  
  // Update stats
  if (stats.gamesPlayed) player.gamesPlayed += stats.gamesPlayed;
  if (stats.wins) player.wins += stats.wins;
  if (stats.kills) player.kills += stats.kills;
  if (stats.deaths) player.deaths += stats.deaths;
  if (stats.bestDepth) player.bestDepth = Math.max(player.bestDepth, stats.bestDepth);
  if (stats.totalXp) player.totalXp += stats.totalXp;
  
  player.timestamp = Date.now();
}

// Get player statistics
export function getPlayerStats(playerId) {
  return LEADERBOARD.playerStats.get(playerId);
}

// Get all player statistics (for admin purposes)
export function getAllPlayerStats() {
  return Array.from(LEADERBOARD.playerStats.values());
}

// Start a new game session
export function startSession(playerId, playerName) {
  const sessionId = 'S' + Date.now() + Math.floor(Math.random() * 1000);
  
  LEADERBOARD.sessions.set(sessionId, {
    playerId,
    playerName,
    score: 0,
    kills: 0,
    deaths: 0,
    depth: 0,
    startTime: Date.now(),
    endTime: null,
    status: 'active', // active, completed, abandoned
  });
  
  return sessionId;
}

// Update session progress
export function updateSession(sessionId, updates) {
  const session = LEADERBOARD.sessions.get(sessionId);
  if (!session || session.status !== 'active') return;
  
  if (updates.kills) session.kills += updates.kills;
  if (updates.deaths) session.deaths += updates.deaths;
  if (updates.depth) session.depth = Math.max(session.depth, updates.depth);
  if (updates.score) session.score += updates.score;
}

// End a session
export function endSession(sessionId, completed = true) {
  const session = LEADERBOARD.sessions.get(sessionId);
  if (!session) return;
  
  session.status = completed ? 'completed' : 'abandoned';
  session.endTime = Date.now();
  
  // Update permanent stats
  const gamesPlayed = 1;
  const wins = completed ? 1 : 0;
  
  updatePlayerStats(session.playerId, session.playerName, {
    gamesPlayed,
    wins,
    kills: session.kills,
    deaths: session.deaths,
    bestDepth: session.depth,
    totalXp: session.score,
  });
  
  // Update leaderboards
  updateScore(session.playerId, session.playerName, CATEGORIES.KILLS, session.kills);
  updateScore(session.playerId, session.playerName, CATEGORIES.DEPTH, session.depth);
  if (completed) {
    updateScore(session.playerId, session.playerName, CATEGORIES.WINS, 1);
  }
  updateScore(session.playerId, session.playerName, CATEGORIES.XP, session.score);
  
  return session;
}

// Get active sessions
export function getActiveSessions() {
  return Array.from(LEADERBOARD.sessions.values())
    .filter(s => s.status === 'active')
    .map(s => ({
      sessionId: s.sessionId,
      playerName: s.playerName,
      kills: s.kills,
      depth: s.depth,
      time: Math.floor((Date.now() - s.startTime) / 1000),
    }));
}

// Get recent sessions (last 24 hours)
export function getRecentSessions(limit = 20) {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  
  return Array.from(LEADERBOARD.sessions.values())
    .filter(s => s.endTime >= dayAgo)
    .sort((a, b) => b.endTime - a.endTime)
    .slice(0, limit)
    .map(s => ({
      playerName: s.playerName,
      kills: s.kills,
      deaths: s.deaths,
      depth: s.depth,
      score: s.score,
      time: Math.floor((s.endTime - s.startTime) / 1000),
      status: s.status,
    }));
}

// Get player ranking in a category
export function getPlayerRank(playerId, category) {
  const scores = LEADERBOARD.highScores.get(category) || [];
  const rank = scores.findIndex(s => s.playerId === playerId);
  return rank === -1 ? null : rank + 1;
}

// Get player's overall stats summary
export function getPlayerSummary(playerId) {
  const stats = getPlayerStats(playerId);
  if (!stats) return null;
  
  const killsRank = getPlayerRank(playerId, CATEGORIES.KILLS);
  const depthRank = getPlayerRank(playerId, CATEGORIES.DEPTH);
  const winsRank = getPlayerRank(playerId, CATEGORIES.WINS);
  
  return {
    playerId,
    playerName: stats.playerName,
    gamesPlayed: stats.gamesPlayed,
    wins: stats.wins,
    winRate: stats.gamesPlayed > 0 ? (stats.wins / stats.gamesPlayed * 100).toFixed(1) : '0',
    kills: stats.kills,
    deaths: stats.deaths,
    killsRank,
    bestDepth: stats.bestDepth,
    depthRank,
    totalXp: stats.totalXp,
    xpRank: winsRank,
    playTime: Math.floor((Date.now() - stats.timestamp) / 1000 / 60), // minutes since first game
  };
}

// Clear old data (cleanup)
export function cleanupOldData(maxAge = 7 * 24 * 60 * 60 * 1000) {
  const now = Date.now();
  const cutoff = now - maxAge;
  
  // Remove player stats older than maxAge
  for (const [playerId, stats] of LEADERBOARD.playerStats.entries()) {
    if (stats.timestamp < cutoff) {
      LEADERBOARD.playerStats.delete(playerId);
    }
  }
  
  // Remove old sessions
  for (const [sessionId, session] of LEADERBOARD.sessions.entries()) {
    if (session.endTime && session.endTime < cutoff) {
      LEADERBOARD.sessions.delete(sessionId);
    }
  }
}

// Periodic cleanup (weekly)
setInterval(cleanupOldData, 7 * 24 * 60 * 60 * 1000);
