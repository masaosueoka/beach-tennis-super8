import { Server as HttpServer } from 'http';
import { Server as IOServer, Socket } from 'socket.io';
import { eventBus } from '../database/event-bus';
import { verifyToken } from '../../application/use-cases/auth.use-case';

/**
 * Real-time gateway.
 *
 * Rooms:
 *   - tournament:<id>  — receives standings/matches updates for a live Super 8
 *   - circuit:<id>     — receives stage + circuit ranking updates
 *   - category:<id>    — receives category-level ranking updates
 *   - user:<id>        — private channel (notifications)
 *   - global           — anything interesting (dashboard)
 *
 * Auth is optional: anonymous clients can subscribe to public rooms.
 * Private rooms (user:*) require a valid JWT passed in socket.handshake.auth.token.
 */

export interface RealtimeGateway {
  io: IOServer;
  close: () => Promise<void>;
}

export function createRealtimeGateway(httpServer: HttpServer): RealtimeGateway {
  const io = new IOServer(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    path: '/ws',
  });

  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      // Anonymous — allowed but cannot join user:* rooms.
      (socket.data as { userId?: string }).userId = undefined;
      return next();
    }
    try {
      const payload = verifyToken(String(token));
      (socket.data as { userId?: string }).userId = payload.sub;
      return next();
    } catch {
      // Bad token — still allow anonymous connection
      return next();
    }
  });

  io.on('connection', (socket) => {
    socket.join('global');

    socket.on('subscribe:tournament', (id: string) => {
      if (typeof id === 'string') socket.join(`tournament:${id}`);
    });
    socket.on('unsubscribe:tournament', (id: string) => {
      if (typeof id === 'string') socket.leave(`tournament:${id}`);
    });

    socket.on('subscribe:circuit', (id: string) => {
      if (typeof id === 'string') socket.join(`circuit:${id}`);
    });
    socket.on('unsubscribe:circuit', (id: string) => {
      if (typeof id === 'string') socket.leave(`circuit:${id}`);
    });

    socket.on('subscribe:category', (id: string) => {
      if (typeof id === 'string') socket.join(`category:${id}`);
    });

    socket.on('subscribe:user', () => {
      const uid = (socket.data as { userId?: string }).userId;
      if (uid) socket.join(`user:${uid}`);
    });
  });

  // ---- Event bus → WebSocket fan-out ----
  // We forward every relevant domain event as-is. The frontend subscribes to
  // the room it cares about and reacts to the event payload.

  eventBus.on('match.finished', (e) => {
    io.to(`tournament:${e.tournamentId}`).emit('match.finished', e);
    io.to('global').emit('match.finished', e);
  });

  eventBus.on('standings.updated', (e) => {
    io.to(`tournament:${e.tournamentId}`).emit('standings.updated', e);
  });

  eventBus.on('tournament.finished', (e) => {
    io.to(`tournament:${e.tournamentId}`).emit('tournament.finished', e);
    io.to('global').emit('tournament.finished', e);
  });

  eventBus.on('ranking.updated', (e) => {
    if (e.categoryId) io.to(`category:${e.categoryId}`).emit('ranking.updated', e);
    io.to('global').emit('ranking.updated', e);
  });

  eventBus.on('circuit.ranking.updated', (e) => {
    io.to(`circuit:${e.circuitId}`).emit('circuit.ranking.updated', e);
    io.to('global').emit('circuit.ranking.updated', e);
  });

  eventBus.on('stage.finished', (e) => {
    // stage.finished carries stageId; circuit fan-out happens via
    // circuit.ranking.updated which is emitted together.
    io.to('global').emit('stage.finished', e);
  });

  eventBus.on('payment.updated', (e) => {
    io.to('global').emit('payment.updated', e);
  });

  return {
    io,
    async close() {
      await new Promise<void>((resolve) => io.close(() => resolve()));
    },
  };
}
