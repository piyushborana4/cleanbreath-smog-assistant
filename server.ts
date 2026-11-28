import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadServerConfig } from './src/server/config/env';
import { createApp } from './src/server/app';
import { logError, logInfo } from './src/server/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer(): Promise<void> {
  const config = loadServerConfig();
  const app = createApp({
    geminiApiKey: config.geminiApiKey,
    googleMapsApiKey: config.googleMapsApiKey,
    allowedOrigins: config.allowedOrigins,
    isProduction: config.nodeEnv === 'production',
    allowEmbedding: config.allowEmbedding,
    rateLimitMax: config.apiRateLimitMax,
    aiRateLimitMax: config.aiRateLimitMax,
    chatStreamTimeoutMs: config.chatStreamTimeoutMs,
    chatMaxConcurrentPerIp: config.chatMaxConcurrentPerIp,
    appCheckEnabled: config.firebaseAppCheckEnabled,
    firebaseProjectNumber: config.firebaseProjectNumber,
    geminiOptions: {
      useVertexAi: config.useVertexAi,
      project: config.gcpProject,
      location: config.gcpLocation,
    },
  });

  if (config.nodeEnv !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath, { maxAge: '1d' }));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(config.port, '0.0.0.0', () => {
    logInfo('server_started', { detail: `Listening on 0.0.0.0:${config.port}` });
  });
}

startServer().catch((err) => {
  logError('server_start_failed', {
    detail: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
