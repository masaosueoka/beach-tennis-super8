import { EventEmitter } from 'node:events';

/**
 * In-process event bus.
 *
 * Use cases (application layer) emit these events after side-effecting work.
 * Listeners (registered once at bootstrap) fan events out to:
 *   - WebSocket broadcasts
 *   - Push notification dispatch
 *   - Ranking/Circuit recalculation
 *
 * In a distributed deployment, swap this for Redis pub/sub or a message queue.
 */
export type DomainEvent =
  | { type: 'match.finished'; tournamentId: string; matchId: string }
  | { type: 'tournament.finished'; tournamentId: string }
  | { type: 'standings.updated'; tournamentId: string }
  | { type: 'ranking.updated'; categoryId: string }
  | { type: 'circuit.ranking.updated'; circuitId: string }
  | { type: 'stage.finished'; stageId: string }
  | { type: 'payment.updated'; paymentId: string };

class DomainEventBus {
  private emitter = new EventEmitter();

  emit(event: DomainEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on<T extends DomainEvent['type']>(
    type: T,
    listener: (event: Extract<DomainEvent, { type: T }>) => void | Promise<void>,
  ): void {
    this.emitter.on(type, listener as (e: DomainEvent) => void);
  }

  onAny(listener: (event: DomainEvent) => void | Promise<void>): void {
    this.emitter.on('*', listener);
  }
}

export const eventBus = new DomainEventBus();
