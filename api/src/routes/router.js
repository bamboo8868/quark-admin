/**
 * Route group helper for organizing routes
 */
export class RouteGroup {
  constructor(app, prefix = '', defaultOptions = {}) {
    this.app = app;
    this.prefix = prefix;
    this.defaultOptions = defaultOptions;
    this.middlewares = [];
  }

  /**
   * Add middleware to this group
   */
  use(...handlers) {
    this.middlewares.push(...handlers);
    return this;
  }

  /**
   * Register GET route
   */
  get(path, ...handlers) {
    return this.route('GET', path, ...handlers);
  }

  /**
   * Register POST route
   */
  post(path, ...handlers) {
    return this.route('POST', path, ...handlers);
  }

  /**
   * Register PUT route
   */
  put(path, ...handlers) {
    return this.route('PUT', path, ...handlers);
  }

  /**
   * Register PATCH route
   */
  patch(path, ...handlers) {
    return this.route('PATCH', path, ...handlers);
  }

  /**
   * Register DELETE route
   */
  delete(path, ...handlers) {
    return this.route('DELETE', path, ...handlers);
  }

  /**
   * Register route - last handler is the main handler, others are middleware
   */
  route(method, path, ...handlers) {
    const fullPath = this.prefix + path;
    
    // Last handler is the route handler
    const handler = handlers.pop();
    
    // Combine group middlewares with route-specific middlewares
    const preHandler = [...this.middlewares, ...handlers];

    this.app.route({
      method,
      url: fullPath,
      preHandler: preHandler.length > 0 ? preHandler : undefined,
      handler
    });

    return this;
  }

  /**
   * Create nested route group
   */
  group(prefix, callback) {
    const subGroup = new RouteGroup(this.app, this.prefix + prefix, this.defaultOptions);
    subGroup.middlewares = [...this.middlewares];
    callback(subGroup);
    return this;
  }
}

/**
 * Create a route group
 */
export function createRouteGroup(app, prefix, callback) {
  const group = new RouteGroup(app, prefix);
  callback(group);
  return group;
}

/**
 * Resource route helper - creates CRUD routes for a resource
 */
export function resource(app, prefix, controller, options = {}) {
  const { middleware = [], only = ['index', 'show', 'store', 'update', 'destroy'] } = options;
  const group = new RouteGroup(app, prefix);
  group.use(...middleware);

  const routes = {
    index: () => group.get('/', controller.index),
    show: () => group.get('/:id', controller.show),
    store: () => group.post('/', controller.store),
    update: () => group.put('/:id', controller.update),
    destroy: () => group.delete('/:id', controller.destroy)
  };

  only.forEach(action => routes[action]?.());

  return group;
}

export default RouteGroup;
