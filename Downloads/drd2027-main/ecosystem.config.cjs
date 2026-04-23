module.exports = {
  apps: [{
    name: 'yt-clear-3001',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '800M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DATABASE_URL: 'sqlite://./data/database.sqlite'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    restart_delay: 3000,
    max_restarts: 10,
    exp_backoff_restart_delay: 100
  }]
};
