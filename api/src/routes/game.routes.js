import { gameController } from '../controllers/game.controller.js';

/**
 * Game routes
 */
export async function gameRoutes(app) {
  // Get games list
  app.post('/games', gameController.getGames);
  // Get game by ID
  app.get('/games/:id', gameController.getGameById);
  // Create game
  app.post('/games/create', gameController.createGame);
  // Update game
  app.put('/games/:id', gameController.updateGame);
  // Delete game
  app.delete('/games/:id', gameController.deleteGame);
  // Batch delete games
  app.post('/games/batch-delete', gameController.batchDeleteGames);
}

export default gameRoutes;
