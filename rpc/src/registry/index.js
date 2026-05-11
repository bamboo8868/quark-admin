/**
 * Service Registry exports
 */

export { RegistryServer } from './registry-server.js';
export { RegistryClient } from './registry-client.js';

// Default export
import { RegistryServer } from './registry-server.js';
import { RegistryClient } from './registry-client.js';

export default {
  RegistryServer,
  RegistryClient
};
