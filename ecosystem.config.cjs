const fs = require('fs');
const path = require('path');

const cwd = __dirname;
const envPath = path.join(cwd, '.env.production');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .reduce((env, line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith('#')) {
        return env;
      }

      const separatorIndex = trimmed.indexOf('=');

      if (separatorIndex === -1) {
        return env;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      const value = trimmed.slice(separatorIndex + 1).trim();

      env[key] = value.replace(/^["']|["']$/g, '');
      return env;
    }, {});
}

const productionEnv = loadEnvFile(envPath);
const port = productionEnv.PORT || '4000';

module.exports = {
  apps: [
    {
      name: 'unixsee-api',
      cwd,
      script: 'dist/src/main.js',
      interpreter: 'node',
      exec_mode: 'fork',
      instances: 1,
      env: {
        ...productionEnv,
        NODE_ENV: 'production',
        PORT: port,
      },
      time: true,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '512M',
    },
  ],
};
