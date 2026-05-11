/**
 * Logic Server Examples
 * Export all server types for easy importing
 */

export { createGameServer } from './game-server.js';
export { createRoomServer } from './room-server.js';
export { createUserServer } from './user-server.js';

// Default export
import { createGameServer } from './game-server.js';
import { createRoomServer } from './room-server.js';
import { createUserServer } from './user-server.js';

export default {
  createGameServer,
  createRoomServer,
  createUserServer
};
