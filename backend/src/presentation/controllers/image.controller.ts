import { Request, Response } from 'express';
import { WhatsAppImageGenerator } from '../../infrastructure/image-generator/whatsapp.generator';
import { PlayerRepository } from '../../infrastructure/repositories/player.repository';
import { TournamentRepository } from '../../infrastructure/repositories/tournament.repository';
import { CircuitRepository } from '../../infrastructure/repositories/circuit.repository';
import { CategoryRepository } from '../../infrastructure/repositories/misc.repositories';
import { NotFoundError } from '../../domain/errors';

const generator = new WhatsAppImageGenerator();
const playerRepo = new PlayerRepository();
const tournamentRepo = new TournamentRepository();
const circuitRepo = new CircuitRepository();
const categoryRepo = new CategoryRepository();

function sendPng(res: Response, buffer: Buffer, filename: string): void {
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.send(buffer);
}

export const ImageController = {
  /**
   * Global top-5 ranking card (across all categories).
   * /images/ranking/top5.png
   */
  async rankingTop5(_req: Request, res: Response): Promise<void> {
    const top = await playerRepo.topByRanking(5);
    const png = await generator.generateRankingTop5({
      title: 'TOP 5 — Ranking Geral',
      subtitle: 'Beach Tennis Super 8',
      entries: top.map((p, i) => ({
        position: i + 1,
        name: p.name,
        points: p.rankingPoints,
        photoUrl: p.photoUrl ?? null,
      })),
    });
    sendPng(res, png, 'ranking-top5.png');
  },

  /**
   * Circuit top-5 card.
   * /images/circuits/:id/top5.png
   */
  async circuitTop5(req: Request, res: Response): Promise<void> {
    const circuit = await circuitRepo.findById(req.params.id);
    if (!circuit) throw new NotFoundError('Circuit', req.params.id);
    const ranking = await circuitRepo.getCircuitRanking(req.params.id, 5);
    const png = await generator.generateRankingTop5({
      title: `TOP 5 — ${circuit.name}`,
      subtitle: 'Circuito',
      entries: ranking.map((r, i) => ({
        position: i + 1,
        name: r.player.name,
        points: r.totalPoints,
        photoUrl: r.player.photoUrl ?? null,
      })),
    });
    sendPng(res, png, 'circuit-top5.png');
  },

  /**
   * Per-category top-5 ranking card.
   * /images/categories/:id/top5.png
   */
  async categoryTop5(req: Request, res: Response): Promise<void> {
    const category = await categoryRepo.findById(req.params.id);
    if (!category) throw new NotFoundError('Category', req.params.id);
    const top = await playerRepo.list({ categoryId: req.params.id });
    const sorted = [...top].sort((a, b) => b.rankingPoints - a.rankingPoints).slice(0, 5);
    const png = await generator.generateRankingTop5({
      title: `TOP 5 — ${category.name}`,
      subtitle: 'Ranking da Categoria',
      entries: sorted.map((p, i) => ({
        position: i + 1,
        name: p.name,
        points: p.rankingPoints,
        photoUrl: p.photoUrl ?? null,
      })),
    });
    sendPng(res, png, 'category-top5.png');
  },

  /**
   * Tournament Super 8 standings card (post-event or live).
   * /images/tournaments/:id/standings.png
   */
  async tournamentStandings(req: Request, res: Response): Promise<void> {
    const tournament = await tournamentRepo.findByIdWithRelations(req.params.id);
    if (!tournament) throw new NotFoundError('Tournament', req.params.id);
    const entries = tournament.standings
      .slice()
      .sort(
        (a, b) => (a.position ?? 99) - (b.position ?? 99) || b.points - a.points,
      );
    const png = await generator.generateSuper8Standings({
      title: tournament.name,
      subtitle: tournament.category?.name ?? 'Super 8',
      entries: entries.map((s, i) => ({
        position: s.position ?? i + 1,
        name: s.player.name,
        wins: s.wins,
        losses: s.losses,
        setDifference: s.setDifference,
        gameDifference: s.gameDifference,
        points: s.points,
        photoUrl: s.player.photoUrl ?? null,
      })),
    });
    sendPng(res, png, 'super8-standings.png');
  },
};
