import { UserController } from '../controllers/user.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateBody, ValidationSchema, v, compose } from '../middlewares/validation.middleware.js';
import { createCacheMiddleware, createPaginationLimitMiddleware } from '../middlewares/performance.middleware.js';
import { createRouteGroup } from './router.js';

// Validation schemas
const schemas = {
  create: ValidationSchema.object({
    email: compose(v.required(), v.email()),
    password: compose(v.required(), v.min(6)),
    name: v.string(),
    role: v.oneOf(['user', 'admin'])
  }),
  update: ValidationSchema.object({
    name: v.string(),
    avatar: v.string(),
    phone: v.string(),
    role: v.oneOf(['user', 'admin']),
    is_active: v.boolean()
  }),
  profile: ValidationSchema.object({
    name: v.string(),
    avatar: v.string(),
    phone: v.string()
  })
};

// Cache key generators
const cacheKeys = {
  list: (req) => `users:list:${JSON.stringify(req.query)}`,
  detail: (req) => `users:${req.params.id}`
};

/**
 * User routes
 */
export async function userRoutes(app, opts) {
  const c = new UserController();

  createRouteGroup(app, '', (route) => {
    // Admin routes
    route.use(authenticate, authorize(['admin'])).group('', (admin) => {
      admin.get('/', 
        createPaginationLimitMiddleware(50),
        createCacheMiddleware({ ttl: 300, keyGenerator: cacheKeys.list }),
        (req, reply) => c.findAll(req, reply)
      );

      admin.post('/', validateBody(schemas.create), (req, reply) => c.create(req, reply));
      admin.put('/:id', validateBody(schemas.update), (req, reply) => c.update(req, reply));
      admin.delete('/:id', (req, reply) => c.delete(req, reply));
    });

    // Authenticated routes
    route.use(authenticate).group('', (auth) => {
      auth.get('/:id',
        createCacheMiddleware({ ttl: 600, keyGenerator: cacheKeys.detail }),
        (req, reply) => c.findById(req, reply)
      );

      auth.put('/profile/me', validateBody(schemas.profile), (req, reply) => c.updateProfile(req, reply));
    });
  });
}

export default userRoutes;
