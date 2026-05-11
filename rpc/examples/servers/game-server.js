/**
 * Game Server
 * Handles game logic: players, matches, scores, game state
 */

import { LogicServer } from '../../src/gateway/logic-server.js';

class GameService {
  constructor() {
    this.players = new Map();
    this.matches = new Map();
    this.rooms = new Map();
  }

  // Player management
  async playerLogin(body) {
    const { playerId, name } = body;
    const player = {
      id: playerId,
      name,
      status: 'online',
      score: 0,
      roomId: null,
      loginTime: Date.now()
    };
    this.players.set(playerId, player);
    return { success: true, player };
  }

  async playerLogout(body) {
    const { playerId } = body;
    this.players.delete(playerId);
    return { success: true, message: 'Player logged out' };
  }

  async getPlayer(body) {
    const { playerId } = body;
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    return { player };
  }

  async updatePlayerScore(body) {
    const { playerId, score } = body;
    const player = this.players.get(playerId);
    if (!player) {
      throw new Error('Player not found');
    }
    player.score += score;
    return { success: true, playerId, newScore: player.score };
  }

  // Match making
  async findMatch(body) {
    const { playerId, gameMode } = body;
    const matchId = `match-${Date.now()}`;
    
    const match = {
      id: matchId,
      gameMode,
      players: [playerId],
      status: 'waiting',
      createdAt: Date.now()
    };
    
    this.matches.set(matchId, match);
    
    return { 
      success: true, 
      match,
      message: 'Match created, waiting for opponents'
    };
  }

  async joinMatch(body) {
    const { playerId, matchId } = body;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (match.players.length >= 2) {
      throw new Error('Match is full');
    }
    
    match.players.push(playerId);
    match.status = 'ready';
    
    return { success: true, match };
  }

  async startMatch(body) {
    const { matchId } = body;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    match.status = 'playing';
    match.startedAt = Date.now();
    
    return { 
      success: true, 
      match,
      message: 'Match started!'
    };
  }

  async endMatch(body) {
    const { matchId, winnerId } = body;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    match.status = 'ended';
    match.winner = winnerId;
    match.endedAt = Date.now();
    
    // Update winner score
    if (winnerId && this.players.has(winnerId)) {
      this.players.get(winnerId).score += 100;
    }
    
    return { 
      success: true, 
      match,
      winner: winnerId
    };
  }

  // Game actions
  async playerAction(body) {
    const { playerId, matchId, action, data } = body;
    
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (!match.players.includes(playerId)) {
      throw new Error('Player not in match');
    }
    
    // Process game action
    const actionResult = {
      playerId,
      action,
      timestamp: Date.now(),
      processed: true
    };
    
    return { 
      success: true, 
      action: actionResult,
      matchState: {
        id: match.id,
        status: match.status,
        players: match.players
      }
    };
  }

  // Leaderboard
  async getLeaderboard() {
    const players = Array.from(this.players.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return { 
      leaderboard: players.map((p, index) => ({
        rank: index + 1,
        id: p.id,
        name: p.name,
        score: p.score
      }))
    };
  }
}

// Create and start Game Server
export async function createGameServer(id, port, gatewayPort) {
  const gameService = new GameService();
  
  const server = new LogicServer({
    id,
    port,
    gatewayHost: 'localhost',
    gatewayPort,
    services: ['game', 'player', 'match'],
    metadata: { 
      weight: 3,
      region: 'us-east',
      type: 'game'
    }
  });

  // Player routes
  server.register('player.login', (body) => gameService.playerLogin(body));
  server.register('player.logout', (body) => gameService.playerLogout(body));
  server.register('player.get', (body) => gameService.getPlayer(body));
  server.register('player.updateScore', (body) => gameService.updatePlayerScore(body));

  // Match routes
  server.register('match.find', (body) => gameService.findMatch(body));
  server.register('match.join', (body) => gameService.joinMatch(body));
  server.register('match.start', (body) => gameService.startMatch(body));
  server.register('match.end', (body) => gameService.endMatch(body));

  // Game action routes
  server.register('game.action', (body) => gameService.playerAction(body));
  server.register('game.leaderboard', () => gameService.getLeaderboard());

  await server.start();
  
  console.log(`[GameServer:${id}] Game routes registered:`);
  console.log('  - player.login, player.logout, player.get, player.updateScore');
  console.log('  - match.find, match.join, match.start, match.end');
  console.log('  - game.action, game.leaderboard');
  
  return server;
}

export default createGameServer;
