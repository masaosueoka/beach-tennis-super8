import { CircuitScoringService } from '../src/domain/services/circuit-scoring.service';
import { ValidationError } from '../src/domain/errors';

describe('CircuitScoringService', () => {
  const svc = new CircuitScoringService();
  const defaultTable = {
    '1': 100, '2': 80, '3': 60, '4': 45,
    '5': 30, '6': 20, '7': 10, '8': 5,
  };

  test('applies points table to finished stage', () => {
    const scored = svc.scoreStage(
      [
        { playerId: 'a', position: 1 },
        { playerId: 'b', position: 2 },
        { playerId: 'c', position: 3 },
      ],
      defaultTable,
    );
    expect(scored).toEqual([
      { playerId: 'a', position: 1, pointsEarned: 100 },
      { playerId: 'b', position: 2, pointsEarned: 80 },
      { playerId: 'c', position: 3, pointsEarned: 60 },
    ]);
  });

  test('awards 0 for positions not in the table', () => {
    const scored = svc.scoreStage(
      [{ playerId: 'a', position: 20 }],
      defaultTable,
    );
    expect(scored[0].pointsEarned).toBe(0);
  });

  test('rejects invalid table', () => {
    expect(() =>
      svc.scoreStage([{ playerId: 'a', position: 1 }], { foo: 10 } as any),
    ).toThrow(ValidationError);
  });

  test('rejects negative points', () => {
    expect(() =>
      svc.scoreStage([{ playerId: 'a', position: 1 }], { '1': -5 }),
    ).toThrow(ValidationError);
  });

  test('aggregates across multiple stages', () => {
    const stageResults = [
      // Stage 1
      { playerId: 'a', position: 1, pointsEarned: 100 },
      { playerId: 'b', position: 2, pointsEarned: 80 },
      { playerId: 'c', position: 3, pointsEarned: 60 },
      // Stage 2
      { playerId: 'b', position: 1, pointsEarned: 100 },
      { playerId: 'a', position: 3, pointsEarned: 60 },
      { playerId: 'c', position: 2, pointsEarned: 80 },
      // Stage 3
      { playerId: 'a', position: 2, pointsEarned: 80 },
      { playerId: 'c', position: 1, pointsEarned: 100 },
    ];
    const ranking = svc.aggregateCircuitRanking(stageResults);

    // a: 100 + 60 + 80 = 240 (3 stages, best=1)
    // b: 80 + 100 = 180 (2 stages, best=1)
    // c: 60 + 80 + 100 = 240 (3 stages, best=1)
    // a and c tied at 240 — tie-break by best position (both 1) then stages played (both 3)
    expect(ranking[0].totalPoints).toBe(240);
    expect(ranking[1].totalPoints).toBe(240);
    expect(ranking[2].totalPoints).toBe(180);
    expect(ranking[2].playerId).toBe('b');
  });

  test('handles single stage', () => {
    const ranking = svc.aggregateCircuitRanking([
      { playerId: 'a', position: 1, pointsEarned: 100 },
      { playerId: 'b', position: 2, pointsEarned: 80 },
    ]);
    expect(ranking[0].playerId).toBe('a');
    expect(ranking[0].rank).toBe(1);
    expect(ranking[1].rank).toBe(2);
  });
});
