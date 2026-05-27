module.exports = {
  apps: [
    {
      name: 'quark-api',
      script: 'src/app.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'quark-email-sync',
      script: 'src/workers/emailSyncWorker.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M'
    },
    {
      name: 'quark-email-exists',
      script: 'src/workers/emailExistsWorker.js',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      watch: false,
      max_memory_restart: '512M'
    }
  ]
};
