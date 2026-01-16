module.exports = {
  apps: [
    {
      name: 'construction-app',
      script: './dist/index.js',
      instances: 2,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      env: {
        NODE_ENV: process.env.NODE_ENV || 'production',
        PORT: process.env.PORT || 6000,
        DATABASE_URL: process.env.DATABASE_URL,
        CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || 'app2.binarjoinanelytic.info',
        JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
        JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
        SESSION_SECRET: process.env.SESSION_SECRET
      }
    }
  ]
};