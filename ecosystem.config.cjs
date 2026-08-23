const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const cwd = __dirname;
const envPath = path.join(cwd, '.env.production');

const productionEnv = fs.existsSync(envPath)
  ? dotenv.parse(fs.readFileSync(envPath))
  : {};

module.exports = {
  apps: [
    {
      name: 'unixsee-api',
      cwd,
      script: 'dist/main.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      env: {
        ...productionEnv,
        NODE_ENV: 'production',
        PORT: productionEnv.PORT || '4000',
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
    },
  ],
};
