import { memberGamesSimpleController } from '../controllers/memberGamesSimple.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

/**
 * Member Games Simple routes (admin back office)
 * 会员简易游戏库 member_games_simple CRUD
 */
export async function memberGamesSimpleRoutes(app) {
  app.addHook('preHandler', authenticate);
  // Get simple games list
  app.post('/member-games-simple', memberGamesSimpleController.getGames);
  // Get simple game by ID
  app.get('/member-games-simple/:id', memberGamesSimpleController.getGameById);
  // Create simple game
  app.post('/member-games-simple/create', memberGamesSimpleController.createGame);
  // Import SDA/maFile (bind shared_secret to existing rows only)
  app.post('/member-games-simple/import', memberGamesSimpleController.importGames);
  // Update simple game
  app.put('/member-games-simple/:id', memberGamesSimpleController.updateGame);
  // Delete simple game
  app.delete('/member-games-simple/:id', memberGamesSimpleController.deleteGame);
}

export default memberGamesSimpleRoutes;
