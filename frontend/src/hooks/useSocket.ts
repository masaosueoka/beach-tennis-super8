'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE } from '@/lib/api';

type EventHandler = (payload: unknown) => void;

/**
 * Manages a single Socket.IO connection per component. Pass a map of
 * event → handler, and subscribe() helpers to join tournament/circuit rooms.
 *
 * Usage:
 *   useSocket({
 *     events: {
 *       'standings.updated': () => refetch(),
 *     },
 *     subscribe: { tournament: tournamentId },
 *   });
 */
export function useSocket({
  events,
  subscribe,
}: {
  events: Record<string, EventHandler>;
  subscribe?: { tournament?: string; circuit?: string; category?: string };
}): void {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('auth_token')
        : null;

    const socket = io(API_BASE, {
      path: '/ws',
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (subscribe?.tournament) {
        socket.emit('subscribe:tournament', subscribe.tournament);
      }
      if (subscribe?.circuit) {
        socket.emit('subscribe:circuit', subscribe.circuit);
      }
      if (subscribe?.category) {
        socket.emit('subscribe:category', subscribe.category);
      }
      if (token) socket.emit('subscribe:user');
    });

    for (const [event, handler] of Object.entries(events)) {
      socket.on(event, handler);
    }

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // We deliberately don't list `events` in the deps array — handlers should
    // be stable (useCallback) or the effect would recreate the socket on every
    // render. Callers re-instantiate the hook if they really need different
    // handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscribe?.tournament, subscribe?.circuit, subscribe?.category]);
}
