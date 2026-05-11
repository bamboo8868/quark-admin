/**
 * User Server
 * Handles user management: auth, profiles, friends, inventory
 */

import { LogicServer } from '../../src/gateway/logic-server.js';

class UserService {
  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.friendships = new Map(); // userId -> Set<friendId>
    this.inventories = new Map(); // userId -> items[]
  }

  // Auth
  async login(body) {
    const { username, password } = body;
    
    // Simple auth (in real app, check against database)
    let user = Array.from(this.users.values()).find(u => u.username === username);
    
    if (!user) {
      // Auto-create for demo
      user = {
        id: `user-${Date.now()}`,
        username,
        nickname: username,
        avatar: null,
        level: 1,
        exp: 0,
        coins: 1000,
        gems: 100,
        createdAt: Date.now()
      };
      this.users.set(user.id, user);
      this.friendships.set(user.id, new Set());
      this.inventories.set(user.id, []);
    }
    
    const sessionId = `session-${Date.now()}`;
    this.sessions.set(sessionId, {
      userId: user.id,
      createdAt: Date.now()
    });
    
    return {
      success: true,
      user: this.sanitizeUser(user),
      sessionId
    };
  }

  async logout(body) {
    const { sessionId } = body;
    this.sessions.delete(sessionId);
    return { success: true, message: 'Logged out' };
  }

  async validateSession(body) {
    const { sessionId } = body;
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      throw new Error('Invalid session');
    }
    
    const user = this.users.get(session.userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return { valid: true, user: this.sanitizeUser(user) };
  }

  // Profile
  async getProfile(body) {
    const { userId } = body;
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return { profile: this.sanitizeUser(user) };
  }

  async updateProfile(body) {
    const { userId, nickname, avatar } = body;
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    if (nickname) user.nickname = nickname;
    if (avatar) user.avatar = avatar;
    
    return { 
      success: true, 
      profile: this.sanitizeUser(user) 
    };
  }

  // Friends
  async addFriend(body) {
    const { userId, friendId } = body;
    
    if (userId === friendId) {
      throw new Error('Cannot add yourself');
    }
    
    const user = this.users.get(userId);
    const friend = this.users.get(friendId);
    
    if (!user || !friend) {
      throw new Error('User not found');
    }
    
    const userFriends = this.friendships.get(userId);
    if (userFriends.has(friendId)) {
      throw new Error('Already friends');
    }
    
    userFriends.add(friendId);
    this.friendships.get(friendId).add(userId);
    
    return { 
      success: true, 
      message: 'Friend added',
      friend: this.sanitizeUser(friend)
    };
  }

  async removeFriend(body) {
    const { userId, friendId } = body;
    
    const userFriends = this.friendships.get(userId);
    if (userFriends) {
      userFriends.delete(friendId);
    }
    
    const friendFriends = this.friendships.get(friendId);
    if (friendFriends) {
      friendFriends.delete(userId);
    }
    
    return { success: true, message: 'Friend removed' };
  }

  async getFriends(body) {
    const { userId } = body;
    const user = this.users.get(userId);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const friendIds = this.friendships.get(userId) || new Set();
    const friends = Array.from(friendIds)
      .map(id => this.users.get(id))
      .filter(Boolean)
      .map(u => this.sanitizeUser(u));
    
    return { friends, count: friends.length };
  }

  // Inventory
  async getInventory(body) {
    const { userId } = body;
    const items = this.inventories.get(userId) || [];
    
    return { items, count: items.length };
  }

  async addItem(body) {
    const { userId, itemId, itemType, quantity = 1, data = {} } = body;
    
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    let items = this.inventories.get(userId);
    if (!items) {
      items = [];
      this.inventories.set(userId, items);
    }
    
    const existingItem = items.find(i => i.itemId === itemId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      items.push({
        itemId,
        itemType,
        quantity,
        acquiredAt: Date.now(),
        ...data
      });
    }
    
    return { 
      success: true, 
      items 
    };
  }

  async useItem(body) {
    const { userId, itemId, quantity = 1 } = body;
    
    const items = this.inventories.get(userId);
    if (!items) {
      throw new Error('Inventory empty');
    }
    
    const item = items.find(i => i.itemId === itemId);
    if (!item) {
      throw new Error('Item not found');
    }
    
    if (item.quantity < quantity) {
      throw new Error('Not enough items');
    }
    
    item.quantity -= quantity;
    
    if (item.quantity === 0) {
      const index = items.indexOf(item);
      items.splice(index, 1);
    }
    
    return { 
      success: true, 
      used: quantity,
      remaining: item.quantity 
    };
  }

  // Currency
  async addCurrency(body) {
    const { userId, coins = 0, gems = 0 } = body;
    
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    user.coins += coins;
    user.gems += gems;
    
    return { 
      success: true, 
      coins: user.coins,
      gems: user.gems
    };
  }

  // Helper
  sanitizeUser(user) {
    return {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      level: user.level,
      exp: user.exp,
      coins: user.coins,
      gems: user.gems
    };
  }
}

// Create and start User Server
export async function createUserServer(id, port, gatewayPort) {
  const userService = new UserService();
  
  const server = new LogicServer({
    id,
    port,
    gatewayHost: 'localhost',
    gatewayPort,
    services: ['user', 'auth', 'friend', 'inventory'],
    metadata: { 
      weight: 2,
      region: 'us-east',
      type: 'user'
    }
  });

  // Auth routes
  server.register('auth.login', (body) => userService.login(body));
  server.register('auth.logout', (body) => userService.logout(body));
  server.register('auth.validate', (body) => userService.validateSession(body));

  // User routes
  server.register('user.get', (body) => userService.getProfile(body));
  server.register('user.update', (body) => userService.updateProfile(body));

  // Friend routes
  server.register('friend.add', (body) => userService.addFriend(body));
  server.register('friend.remove', (body) => userService.removeFriend(body));
  server.register('friend.list', (body) => userService.getFriends(body));

  // Inventory routes
  server.register('inventory.get', (body) => userService.getInventory(body));
  server.register('inventory.add', (body) => userService.addItem(body));
  server.register('inventory.use', (body) => userService.useItem(body));

  // Currency routes
  server.register('currency.add', (body) => userService.addCurrency(body));

  await server.start();
  
  console.log(`[UserServer:${id}] User routes registered:`);
  console.log('  - auth.login, auth.logout, auth.validate');
  console.log('  - user.get, user.update');
  console.log('  - friend.add, friend.remove, friend.list');
  console.log('  - inventory.get, inventory.add, inventory.use');
  console.log('  - currency.add');
  
  return server;
}

export default createUserServer;
