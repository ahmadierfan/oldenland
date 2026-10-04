// pm2 config: serves the built site (./out) on 127.0.0.1:4804 for nginx to proxy.
//   npm ci && npm run build && pm2 start ecosystem.config.cjs && pm2 save
module.exports = {
  apps: [
    {
      name: "oldenland",
      cwd: __dirname,
      script: "node_modules/serve/build/main.js",
      args: "out --no-clipboard --listen tcp://127.0.0.1:4804",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      max_memory_restart: "200M",
      env: { NODE_ENV: "production" },
    },
  ],
};
