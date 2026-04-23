import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { createServer } from 'http';

import { authRouter } from './presentation/routes/auth.routes';
import { playerRouter } from './presentation/routes/player.routes';
import { categoryRouter } from './presentation/routes/category.routes';
import { tournamentRouter } from './presentation/routes/tournament.routes';
import { rankingRouter } from './presentation/routes/ranking.routes';
import { circuitRouter } from './presentation/routes/circuit.routes';
import { paymentRouter } from './presentation/routes/payment.routes';
import { sponsorRouter } from './presentation/routes/sponsor.routes';
import { notificationRouter } from './presentation/routes/notification.routes';
import { imageRouter } from './presentation/routes/image.routes';
import { storageRouter } from './presentation/routes/storage.routes';

import { attachUser } from './presentation/middleware/auth.middleware';
import { errorHandler } from './presentation/middleware/error-handler.middleware';

import { bootstrapEventListeners } from './infrastructure/database/event-listeners';
import { createRealtimeGateway } from './infrastructure/websocket/gateway';

const PORT = parseInt(process.env.PORT || '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Populate req.user when a valid Bearer token is present (optional).
app.use(attachUser);

// ---- Health ----
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ---- API routes ----
app.use('/api/auth', authRouter);
app.use('/api/players', playerRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/tournaments', tournamentRouter);
app.use('/api/rankings', rankingRouter);
app.use('/api/circuits', circuitRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/sponsors', sponsorRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/storage', storageRouter);
app.use('/images', imageRouter);

// 404 fallback for unmatched API routes
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'NotFound', message: 'Route not found' });
});

// Error handler MUST be last
app.use(errorHandler);

// ---- HTTP + WebSocket server ----
const httpServer = createServer(app);
const gateway = createRealtimeGateway(httpServer);

// Wire domain events to side-effect handlers.
bootstrapEventListeners();

httpServer.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[server] listening on :${PORT} (ws path: /ws)`);
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[server] ${signal} received, shutting down...`);
  await gateway.close().catch(() => undefined);
  httpServer.close(() => process.exit(0));
  // Hard exit after 10s if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export { app, httpServer };
