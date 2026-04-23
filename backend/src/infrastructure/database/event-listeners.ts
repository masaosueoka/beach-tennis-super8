import { eventBus } from '../database/event-bus';
import { RecomputeCircuitRankingUseCase } from '../../application/use-cases/recompute-circuit-ranking.use-case';
import { TournamentRepository } from '../repositories/tournament.repository';
import { CircuitRepository } from '../repositories/circuit.repository';
import { PlayerRepository } from '../repositories/player.repository';
import { NotificationService } from '../notifications/notification.service';
import { NotificationRepository } from '../repositories/misc.repositories';

/**
 * Registers all cross-module side-effect listeners at bootstrap.
 *
 * Kept idempotent: safe to call exactly once from `server.ts`.
 */
export function bootstrapEventListeners(): void {
  const tournamentRepo = new TournamentRepository();
  const circuitRepo = new CircuitRepository();
  const playerRepo = new PlayerRepository();
  const notificationRepo = new NotificationRepository();
  const notifications = new NotificationService(notificationRepo);

  const recomputeCircuit = new RecomputeCircuitRankingUseCase(
    circuitRepo,
    tournamentRepo,
    playerRepo,
  );

  // 1. When a tournament finishes, roll results into the circuit ranking.
  eventBus.on('tournament.finished', async (e) => {
    try {
      await recomputeCircuit.onTournamentFinished(e.tournamentId);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[events] circuit recompute failed:', err);
    }
  });

  // 2. Broadcast notification when a match finishes.
  eventBus.on('match.finished', async (e) => {
    try {
      await notifications.notify({
        userId: null, // broadcast
        type: 'MATCH_RESULT',
        title: 'Resultado de partida',
        message: 'Uma partida foi finalizada.',
        data: { tournamentId: e.tournamentId, matchId: e.matchId },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[events] match notification failed:', err);
    }
  });

  // 3. Broadcast notification when a tournament finishes.
  eventBus.on('tournament.finished', async (e) => {
    try {
      await notifications.notify({
        userId: null,
        type: 'TOURNAMENT_ANNOUNCEMENT',
        title: 'Torneio finalizado',
        message: 'Os resultados já estão disponíveis.',
        data: { tournamentId: e.tournamentId },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[events] tournament notification failed:', err);
    }
  });

  // 4. Ranking updates notification.
  eventBus.on('ranking.updated', async (e) => {
    try {
      await notifications.notify({
        userId: null,
        type: 'RANKING_UPDATE',
        title: 'Ranking atualizado',
        message: 'O ranking da categoria foi atualizado.',
        data: { categoryId: e.categoryId },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[events] ranking notification failed:', err);
    }
  });
}
