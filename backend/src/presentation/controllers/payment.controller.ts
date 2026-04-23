import { Request, Response } from 'express';
import { PaymentService } from '../../infrastructure/payment/payment.service';
import { PaymentRepository } from '../../infrastructure/repositories/misc.repositories';
import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import {
  createPaymentSchema,
  updatePaymentStatusSchema,
} from '../../application/dto/schemas';
import { NotFoundError } from '../../domain/errors';

const paymentRepo = new PaymentRepository();
const paymentService = new PaymentService(paymentRepo);
const tournamentRepo = new TournamentRepository();
const playerRepo = new PlayerRepository();

export const PaymentController = {
  async create(req: Request, res: Response): Promise<void> {
    const dto = createPaymentSchema.parse(req.body);
    const tournament = await tournamentRepo.findById(dto.tournamentId);
    if (!tournament) throw new NotFoundError('Tournament', dto.tournamentId);
    const player = await playerRepo.findById(dto.playerId);
    if (!player) throw new NotFoundError('Player', dto.playerId);

    const payment = await paymentService.createForRegistration({
      playerId: dto.playerId,
      tournamentId: dto.tournamentId,
      amount: dto.amount ?? Number(tournament.registrationFee ?? 0),
      payerName: player.name,
      payerEmail: player.email ?? undefined,
    });
    res.status(201).json(payment);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const dto = updatePaymentStatusSchema.parse(req.body);
    const existing = await paymentRepo.findById(req.params.id);
    if (!existing) throw new NotFoundError('Payment', req.params.id);

    if (dto.status === 'PAID') {
      const updated = await paymentService.markPaid(req.params.id, dto.providerRef);
      res.json(updated);
      return;
    }
    if (dto.status === 'CANCELED' || dto.status === 'REFUNDED') {
      const updated = await paymentService.cancel(req.params.id);
      res.json(updated);
      return;
    }
    // PENDING — just a state update via repo
    const updated = await paymentRepo.updateStatus(req.params.id, dto.status);
    res.json(updated);
  },

  async listByTournament(req: Request, res: Response): Promise<void> {
    const payments = await paymentRepo.listByTournament(req.params.tournamentId);
    res.json(payments);
  },
};
