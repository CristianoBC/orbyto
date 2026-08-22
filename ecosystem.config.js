const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'orbyto-api',
      cwd: __dirname,
      script: 'npm',
      args: 'run start:api',
      interpreter: 'none',
      env: { NODE_ENV: 'production', PORT: 3001 },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      time: true,
      out_file: path.join(__dirname, 'logs', 'api-out.log'),
      error_file: path.join(__dirname, 'logs', 'api-error.log'),
      merge_logs: true,
    },
    {
      name: 'orbyto-web',
      cwd: __dirname,
      script: 'npm',
      args: 'run start:web',
      interpreter: 'none',
      env: { NODE_ENV: 'production', PORT: 3000 },
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      time: true,
      out_file: path.join(__dirname, 'logs', 'web-out.log'),
      error_file: path.join(__dirname, 'logs', 'web-error.log'),
      merge_logs: true,
    },
  ],
};
