import { Super8Engine } from '../src/domain/services/super8-engine.service';
import { ValidationError } from '../src/domain/errors';

describe('Super8Engine — draw', () => {
  const engine = new Super8Engine();

  test('throws when too few players', () => {
    expect(() => engine.draw(['a', 'b'])).toThrow(ValidationError);
  });

  test('throws when too many players', () => {
    expect(() =>
      engine.draw(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']),
    ).toThrow(ValidationError);
  });

  test('throws on duplicate ids', () => {
    expect(() => engine.draw(['a', 'b', 'c', 'a'])).toThrow(ValidationError);
  });

  test('preserves all players and length', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const seeds = engine.draw(ids);
    expect(seeds.length).toBe(8);
    expect(new Set(seeds)).toEqual(new Set(ids));
  });

  test('is deterministic with seeded rng', () => {
    const ids = ['a', 'b', 'c', 'd'];
    const rng = () => 0.42;
    const r1 = engine.draw(ids, rng);
    const r2 = engine.draw(ids, rng);
    expect(r1).toEqual(r2);
  });
});

describe('Super8Engine — round-robin schedule', () => {
  const engine = new Super8Engine();

  test('8 players → 28 matches across 7 rounds', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const pairings = engine.generateRoundRobin(ids);
    expect(pairings.length).toBe(28);

    // Each player plays exactly once per round
    const rounds = new Set(pairings.map((p) => p.roundNumber));
    expect(rounds.size).toBe(7);
    for (const r of rounds) {
      const inRound = pairings.filter((p) => p.roundNumber === r);
      expect(inRound.length).toBe(4);
      const playersInRound = new Set<string>();
      for (const m of inRound) {
        expect(playersInRound.has(m.playerAId)).toBe(false);
        expect(playersInRound.has(m.playerBId)).toBe(false);
        playersInRound.add(m.playerAId);
        playersInRound.add(m.playerBId);
      }
      expect(playersInRound.size).toBe(8);
    }
  });

  test('every pair of players plays exactly once', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'];
    const pairings = engine.generateRoundRobin(ids);

    const pairKey = (a: string, b: string) => [a, b].sort().join('|');
    const seen = new Set<string>();
    for (const p of pairings) {
      const k = pairKey(p.playerAId, p.playerBId);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
    // C(8,2) = 28
    expect(seen.size).toBe(28);
  });

  test('7 players → 21 matches (odd count uses bye)', () => {
    const ids = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'];
    const pairings = engine.generateRoundRobin(ids);
    expect(pairings.length).toBe(21);

    // Each player plays 6 matches total
    const counts = new Map<string, number>();
    for (const p of pairings) {
      counts.set(p.playerAId, (counts.get(p.playerAId) ?? 0) + 1);
      counts.set(p.playerBId, (counts.get(p.playerBId) ?? 0) + 1);
    }
    for (const id of ids) {
      expect(counts.get(id)).toBe(6);
    }
  });

  test('5 players → 10 matches', () => {
    const pairings = engine.generateRoundRobin(['a', 'b', 'c', 'd', 'e']);
    expect(pairings.length).toBe(10);
  });

  test('drawAndSchedule returns both seeds and schedule', () => {
    const { seeds, pairings } = engine.drawAndSchedule(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      () => 0.5,
    );
    expect(seeds.length).toBe(8);
    expect(pairings.length).toBe(28);
  });
});
