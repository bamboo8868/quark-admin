/**
 * RPC Router
 * Route management for RPC services
 */

export class RpcRouter {
  constructor() {
    this.routes = new Map();
    this.middlewares = [];
  }

  /**
   * Register a route handler
   */
  register(route, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function');
    }
    this.routes.set(route, handler);
    console.log(`[Router] Registered route: ${route}`);
  }

  /**
   * Register multiple routes
   */
  registerAll(routes) {
    for (const [route, handler] of Object.entries(routes)) {
      this.register(route, handler);
    }
  }

  /**
   * Add middleware
   */
  use(middleware) {
    if (typeof middleware !== 'function') {
      throw new Error('Middleware must be a function');
    }
    this.middlewares.push(middleware);
  }

  /**
   * Route request to handler
   */
  async route(route, body, context = {}) {
    const handler = this.routes.get(route);
    
    if (!handler) {
      throw new Error(`Route not found: ${route}`);
    }

    // Execute middlewares
    let ctx = { ...context, route, body };
    for (const middleware of this.middlewares) {
      ctx = await middleware(ctx) || ctx;
    }

    // Execute handler
    return await handler(ctx.body, ctx);
  }

  /**
   * Check if route exists
   */
  has(route) {
    return this.routes.has(route);
  }

  /**
   * Remove route
   */
  remove(route) {
    return this.routes.delete(route);
  }

  /**
   * Get all registered routes
   */
  getRoutes() {
    return Array.from(this.routes.keys());
  }

  /**
   * Create namespace for grouped routes
   */
  namespace(prefix, routes) {
    for (const [route, handler] of Object.entries(routes)) {
      this.register(`${prefix}.${route}`, handler);
    }
  }
}

export default RpcRouter;
