import { MatchScoringService } from '../src/domain/services/match-scoring.service';
import { InvalidScoreError } from '../src/domain/errors';

describe('MatchScoringService — STANDARD', () => {
  const svc = new MatchScoringService();

  test('accepts a clean 6-2, 6-4 win', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'STANDARD',
      sets: [{ a: 6, b: 2 }, { a: 6, b: 4 }],
    });
    expect(r).toEqual({ setsWonA: 2, setsWonB: 0, gamesWonA: 12, gamesWonB: 6, winner: 'A' });
  });

  test('accepts 7-5 set', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'STANDARD',
      sets: [{ a: 6, b: 3 }, { a: 7, b: 5 }],
    });
    expect(r.winner).toBe('A');
    expect(r.setsWonA).toBe(2);
  });

  test('accepts tiebreak 7-6', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'STANDARD',
      sets: [{ a: 7, b: 6, tiebreak: true }, { a: 6, b: 4 }],
    });
    expect(r.winner).toBe('A');
  });

  test('accepts 3-set decider (split then win)', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'STANDARD',
      sets: [{ a: 6, b: 3 }, { a: 2, b: 6 }, { a: 6, b: 4 }],
    });
    expect(r.setsWonA).toBe(2);
    expect(r.setsWonB).toBe(1);
    expect(r.winner).toBe('A');
  });

  test('rejects 7-6 WITHOUT tiebreak flag', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: 7, b: 6 }, { a: 6, b: 0 }],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects 6-5 (not a valid ending)', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: 6, b: 5 }, { a: 6, b: 0 }],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects 8-6 non-tiebreak', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: 8, b: 6 }, { a: 6, b: 0 }],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects tie in a set', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: 6, b: 6 }, { a: 6, b: 0 }],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects no one reaches 2 sets', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: 6, b: 3 }, { a: 4, b: 6 }],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects negative games', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'STANDARD',
        sets: [{ a: -1, b: 6 }, { a: 6, b: 0 }],
      }),
    ).toThrow(InvalidScoreError);
  });
});

describe('MatchScoringService — PRO', () => {
  const svc = new MatchScoringService();

  test('accepts straight 2-set win', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'PRO',
      sets: [{ a: 6, b: 4 }, { a: 6, b: 3 }],
    });
    expect(r.setsWonA).toBe(2);
    expect(r.winner).toBe('A');
  });

  test('accepts 1-1 decided by super tiebreak 10-8', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'PRO',
      sets: [
        { a: 6, b: 3 },
        { a: 2, b: 6 },
        { a: 10, b: 8, tiebreak: true },
      ],
    });
    expect(r.setsWonA).toBe(2);
    expect(r.setsWonB).toBe(1);
    // Super tiebreak counts as 1 game won, not 10
    expect(r.gamesWonA).toBe(6 + 2 + 1);
    expect(r.gamesWonB).toBe(3 + 6 + 0);
    expect(r.winner).toBe('A');
  });

  test('accepts super tiebreak 12-10', () => {
    const r = svc.validateAndSummarize({
      matchId: 'm1',
      mode: 'PRO',
      sets: [
        { a: 6, b: 3 },
        { a: 2, b: 6 },
        { a: 12, b: 10, tiebreak: true },
      ],
    });
    expect(r.winner).toBe('A');
  });

  test('rejects super tiebreak 10-9 (no 2-point margin)', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'PRO',
        sets: [
          { a: 6, b: 3 },
          { a: 2, b: 6 },
          { a: 10, b: 9, tiebreak: true },
        ],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects super tiebreak 11-8 (margin > 2 after exceeding 10)', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'PRO',
        sets: [
          { a: 6, b: 3 },
          { a: 2, b: 6 },
          { a: 11, b: 8, tiebreak: true },
        ],
      }),
    ).toThrow(InvalidScoreError);
  });

  test('rejects 1-1 without super tiebreak', () => {
    expect(() =>
      svc.validateAndSummarize({
        matchId: 'm1',
        mode: 'PRO',
        sets: [{ a: 6, b: 3 }, { a: 3, b: 6 }],
      }),
    ).toThrow(InvalidScoreError);
  });
});
