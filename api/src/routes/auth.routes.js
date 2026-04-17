import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateBody, ValidationSchema, v, compose } from '../middlewares/validation.middleware.js';
import { createRouteGroup } from './router.js';

// Validation schemas
const schemas = {
  register: ValidationSchema.object({
    email: compose(v.required(), v.email()),
    password: compose(v.required(), v.min(6)),
    name: v.string()
  }),
  login: ValidationSchema.object({
    email: compose(v.required(), v.email()),
    password: v.required()
  }),
  refresh: ValidationSchema.object({
    refreshToken: v.required()
  }),
  changePassword: ValidationSchema.object({
    currentPassword: v.required(),
    newPassword: compose(v.required(), v.min(6))
  })
};

/**
 * Auth routes
 */
export async function authRoutes(app, opts) {
  const c = new AuthController();

  createRouteGroup(app, '', (route) => {
    // Public routes
    route.post('/register', validateBody(schemas.register), (req, reply) => c.register(req, reply));
    route.post('/login', validateBody(schemas.login), (req, reply) => c.login(req, reply));
    route.post('/refresh', validateBody(schemas.refresh), (req, reply) => c.refresh(req, reply));

    // Protected routes
    route.use(authenticate).group('', (auth) => {
      auth.post('/logout', (req, reply) => c.logout(req, reply));
      auth.get('/me', (req, reply) => c.getCurrentUser(req, reply));
      auth.post('/change-password', validateBody(schemas.changePassword), (req, reply) => c.changePassword(req, reply));
    });
  });
}

export default authRoutes;
