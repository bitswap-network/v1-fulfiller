module.exports = {
  apps: [
    {
      name: "fulfiller",
      script: "./build/index.js",
      max_memory_restart: "500M",
      instances: 1,
      autorestart: true,
      env: {
        NODE_ENV: "development",
      },
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
