/**
 * Room Server
 * Handles room management: create, join, leave, chat, room state
 */

import { LogicServer } from '../../src/gateway/logic-server.js';

class RoomService {
  constructor() {
    this.rooms = new Map();
    this.playerRooms = new Map(); // playerId -> roomId
  }

  // Room management
  async createRoom(body) {
    const { playerId, roomName, maxPlayers = 10, password, settings = {} } = body;
    
    const roomId = `room-${Date.now()}`;
    const room = {
      id: roomId,
      name: roomName,
      hostId: playerId,
      maxPlayers,
      password: password || null,
      players: [{
        id: playerId,
        joinedAt: Date.now(),
        isHost: true
      }],
      settings,
      status: 'waiting',
      chat: [],
      createdAt: Date.now()
    };
    
    this.rooms.set(roomId, room);
    this.playerRooms.set(playerId, roomId);
    
    return { 
      success: true, 
      room: this.sanitizeRoom(room)
    };
  }

  async joinRoom(body) {
    const { playerId, roomId, password } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (room.password && room.password !== password) {
      throw new Error('Invalid password');
    }
    
    if (room.players.length >= room.maxPlayers) {
      throw new Error('Room is full');
    }
    
    if (room.players.some(p => p.id === playerId)) {
      throw new Error('Already in room');
    }
    
    room.players.push({
      id: playerId,
      joinedAt: Date.now(),
      isHost: false
    });
    
    this.playerRooms.set(playerId, roomId);
    
    // Add system message
    room.chat.push({
      type: 'system',
      message: `Player ${playerId} joined the room`,
      timestamp: Date.now()
    });
    
    return { 
      success: true, 
      room: this.sanitizeRoom(room)
    };
  }

  async leaveRoom(body) {
    const { playerId, roomId } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      throw new Error('Player not in room');
    }
    
    const isHost = room.players[playerIndex].isHost;
    room.players.splice(playerIndex, 1);
    this.playerRooms.delete(playerId);
    
    // If host leaves, assign new host
    if (isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
    }
    
    // If room is empty, delete it
    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      return { 
        success: true, 
        message: 'Room closed (host left)'
      };
    }
    
    // Add system message
    room.chat.push({
      type: 'system',
      message: `Player ${playerId} left the room`,
      timestamp: Date.now()
    });
    
    return { 
      success: true, 
      room: this.sanitizeRoom(room)
    };
  }

  async getRoom(body) {
    const { roomId } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    return { room: this.sanitizeRoom(room) };
  }

  async listRooms() {
    const rooms = Array.from(this.rooms.values())
      .filter(r => r.status === 'waiting')
      .map(r => ({
        id: r.id,
        name: r.name,
        hostId: r.hostId,
        playerCount: r.players.length,
        maxPlayers: r.maxPlayers,
        hasPassword: !!r.password,
        createdAt: r.createdAt
      }));
    
    return { rooms, count: rooms.length };
  }

  // Room actions
  async startRoom(body) {
    const { playerId, roomId } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (room.hostId !== playerId) {
      throw new Error('Only host can start');
    }
    
    room.status = 'playing';
    room.startedAt = Date.now();
    
    // Add system message
    room.chat.push({
      type: 'system',
      message: 'Game started!',
      timestamp: Date.now()
    });
    
    return { 
      success: true, 
      room: this.sanitizeRoom(room)
    };
  }

  async updateRoomSettings(body) {
    const { playerId, roomId, settings } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (room.hostId !== playerId) {
      throw new Error('Only host can update settings');
    }
    
    room.settings = { ...room.settings, ...settings };
    
    return { 
      success: true, 
      room: this.sanitizeRoom(room)
    };
  }

  // Chat
  async sendChat(body) {
    const { playerId, roomId, message } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    if (!room.players.some(p => p.id === playerId)) {
      throw new Error('Player not in room');
    }
    
    const chatMessage = {
      type: 'chat',
      playerId,
      message,
      timestamp: Date.now()
    };
    
    room.chat.push(chatMessage);
    
    // Keep only last 100 messages
    if (room.chat.length > 100) {
      room.chat = room.chat.slice(-100);
    }
    
    return { 
      success: true, 
      message: chatMessage
    };
  }

  async getChatHistory(body) {
    const { roomId, limit = 50 } = body;
    
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    const messages = room.chat.slice(-limit);
    
    return { 
      messages, 
      count: messages.length 
    };
  }

  // Player room
  async getPlayerRoom(body) {
    const { playerId } = body;
    
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) {
      return { room: null };
    }
    
    const room = this.rooms.get(roomId);
    if (!room) {
      this.playerRooms.delete(playerId);
      return { room: null };
    }
    
    return { room: this.sanitizeRoom(room) };
  }

  // Helper
  sanitizeRoom(room) {
    return {
      id: room.id,
      name: room.name,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      playerCount: room.players.length,
      players: room.players,
      settings: room.settings,
      status: room.status,
      createdAt: room.createdAt,
      startedAt: room.startedAt
    };
  }
}

// Create and start Room Server
export async function createRoomServer(id, port, gatewayPort) {
  const roomService = new RoomService();
  
  const server = new LogicServer({
    id,
    port,
    gatewayHost: 'localhost',
    gatewayPort,
    services: ['room', 'chat'],
    metadata: { 
      weight: 2,
      region: 'us-east',
      type: 'room'
    }
  });

  // Room routes
  server.register('room.create', (body) => roomService.createRoom(body));
  server.register('room.join', (body) => roomService.joinRoom(body));
  server.register('room.leave', (body) => roomService.leaveRoom(body));
  server.register('room.get', (body) => roomService.getRoom(body));
  server.register('room.list', () => roomService.listRooms());
  server.register('room.start', (body) => roomService.startRoom(body));
  server.register('room.updateSettings', (body) => roomService.updateRoomSettings(body));

  // Chat routes
  server.register('chat.send', (body) => roomService.sendChat(body));
  server.register('chat.history', (body) => roomService.getChatHistory(body));

  // Player routes
  server.register('player.room', (body) => roomService.getPlayerRoom(body));

  await server.start();
  
  console.log(`[RoomServer:${id}] Room routes registered:`);
  console.log('  - room.create, room.join, room.leave, room.get, room.list');
  console.log('  - room.start, room.updateSettings');
  console.log('  - chat.send, chat.history');
  console.log('  - player.room');
  
  return server;
}

export default createRoomServer;
