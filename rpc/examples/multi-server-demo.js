/**
 * Multi-Server Demo
 * Demonstrates Gateway routing requests to different logic servers
 * 
 * Architecture:
 *   Client -> Gateway -> User Server (auth, profile, friends)
 *                     -> Room Server (rooms, chat)
 *                     -> Game Server (matches, gameplay)
 */

import { GatewayServer } from '../src/gateway/gateway.js';
import { RpcClient } from '../src/client.js';
import createGameServer from './servers/game-server.js';
import createRoomServer from './servers/room-server.js';
import createUserServer from './servers/user-server.js';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('=== Multi-Server Architecture Demo ===\n');

  // 1. Start Gateway
  console.log('1. Starting Gateway Server...');
  const gateway = new GatewayServer({
    port: 8080,
    webSocketPort: 8081,
    enableWebSocket: true,
    strategy: 'least-connections'
  });

  gateway.on('serviceRegistered', ({ id, type, metadata }) => {
    console.log(`[Gateway] Service up: ${id} (type: ${metadata?.type || 'unknown'})`);
  });

  await gateway.start();
  console.log('');

  // 2. Start User Server
  console.log('2. Starting User Server...');
  const userServer = await createUserServer('user-server-1', 9001, 8080);
  await sleep(300);
  console.log('');

  // 3. Start Room Server
  console.log('3. Starting Room Server...');
  const roomServer = await createRoomServer('room-server-1', 9002, 8080);
  await sleep(300);
  console.log('');

  // 4. Start Game Server
  console.log('4. Starting Game Server...');
  const gameServer = await createGameServer('game-server-1', 9003, 8080);
  await sleep(300);
  console.log('');

  // 5. Show registered services
  console.log('5. Registered Services:');
  const stats = gateway.getStats();
  stats.logicServers.forEach(s => {
    console.log(`   ${s.id}: ${s.metadata?.services?.join(', ')}`);
  });
  console.log('');

  // 6. Client tests - routing to different servers
  console.log('6. Testing Request Routing:\n');
  
  const client = new RpcClient({ host: 'localhost', port: 8080 });

  // Test 1: User routes -> User Server
  console.log('--- Test 1: User Routes (User Server) ---');
  try {
    const login = await client.call('auth.login', { 
      username: 'player1', 
      password: '123456' 
    });
    console.log('auth.login:', login.success ? '✓ Success' : '✗ Failed');
    const userId = login.user.id;
    const sessionId = login.sessionId;

    const profile = await client.call('user.get', { userId });
    console.log('user.get:', profile.profile ? '✓ Success' : '✗ Failed');

    const update = await client.call('user.update', { 
      userId, 
      nickname: 'ProPlayer' 
    });
    console.log('user.update:', update.success ? '✓ Success' : '✗ Failed');

    // Add friends
    const friendLogin = await client.call('auth.login', { 
      username: 'player2', 
      password: '123456' 
    });
    const friendId = friendLogin.user.id;

    const addFriend = await client.call('friend.add', { userId, friendId });
    console.log('friend.add:', addFriend.success ? '✓ Success' : '✗ Failed');

    const friends = await client.call('friend.list', { userId });
    console.log('friend.list:', `${friends.count} friends`);

    // Inventory
    const addItem = await client.call('inventory.add', {
      userId,
      itemId: 'sword-001',
      itemType: 'weapon',
      quantity: 1,
      data: { damage: 100 }
    });
    console.log('inventory.add:', addItem.success ? '✓ Success' : '✗ Failed');

    const inventory = await client.call('inventory.get', { userId });
    console.log('inventory.get:', `${inventory.count} items`);

  } catch (err) {
    console.error('User routes error:', err.message);
  }
  console.log('');

  // Test 2: Room routes -> Room Server
  console.log('--- Test 2: Room Routes (Room Server) ---');
  try {
    const createRoom = await client.call('room.create', {
      playerId: 'player1',
      roomName: 'Pro Room',
      maxPlayers: 4,
      settings: { mode: 'ranked' }
    });
    console.log('room.create:', createRoom.success ? '✓ Success' : '✗ Failed');
    const roomId = createRoom.room.id;

    const joinRoom = await client.call('room.join', {
      playerId: 'player2',
      roomId
    });
    console.log('room.join:', joinRoom.success ? '✓ Success' : '✗ Failed');

    const roomList = await client.call('room.list', {});
    console.log('room.list:', `${roomList.count} rooms available`);

    const chat = await client.call('chat.send', {
      playerId: 'player1',
      roomId,
      message: 'Hello everyone!'
    });
    console.log('chat.send:', chat.success ? '✓ Success' : '✗ Failed');

    const chatHistory = await client.call('chat.history', { roomId });
    console.log('chat.history:', `${chatHistory.count} messages`);

    const startRoom = await client.call('room.start', {
      playerId: 'player1',
      roomId
    });
    console.log('room.start:', startRoom.success ? '✓ Success' : '✗ Failed');

  } catch (err) {
    console.error('Room routes error:', err.message);
  }
  console.log('');

  // Test 3: Game routes -> Game Server
  console.log('--- Test 3: Game Routes (Game Server) ---');
  try {
    const playerLogin = await client.call('player.login', {
      playerId: 'player1',
      name: 'ProPlayer'
    });
    console.log('player.login:', playerLogin.success ? '✓ Success' : '✗ Failed');

    const findMatch = await client.call('match.find', {
      playerId: 'player1',
      gameMode: 'ranked'
    });
    console.log('match.find:', findMatch.success ? '✓ Success' : '✗ Failed');
    const matchId = findMatch.match.id;

    const joinMatch = await client.call('match.join', {
      playerId: 'player2',
      matchId
    });
    console.log('match.join:', joinMatch.success ? '✓ Success' : '✗ Failed');

    const startMatch = await client.call('match.start', { matchId });
    console.log('match.start:', startMatch.success ? '✓ Success' : '✗ Failed');

    const action = await client.call('game.action', {
      playerId: 'player1',
      matchId,
      action: 'move',
      data: { x: 10, y: 20 }
    });
    console.log('game.action:', action.success ? '✓ Success' : '✗ Failed');

    const leaderboard = await client.call('game.leaderboard', {});
    console.log('game.leaderboard:', `${leaderboard.leaderboard?.length || 0} players`);

    const endMatch = await client.call('match.end', {
      matchId,
      winnerId: 'player1'
    });
    console.log('match.end:', endMatch.success ? '✓ Success' : '✗ Failed');

  } catch (err) {
    console.error('Game routes error:', err.message);
  }
  console.log('');

  // 7. Gateway stats
  console.log('7. Final Gateway Stats:');
  const finalStats = gateway.getStats();
  console.log(`   TCP Connections: ${finalStats.connections}`);
  console.log(`   WebSocket Connections: ${finalStats.webSocket?.connections || 0}`);
  console.log(`   Logic Servers: ${finalStats.logicServers.length}`);
  console.log(`   Strategy: ${finalStats.strategy}`);
  console.log('');

  // Cleanup
  console.log('8. Cleanup...');
  await client.disconnect();
  await sleep(500);
  
  await userServer.stop();
  await roomServer.stop();
  await gameServer.stop();
  await gateway.stop();
  
  console.log('\nDemo completed!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
