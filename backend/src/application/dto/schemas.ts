import { z } from 'zod';

// ---- Auth ----
export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.enum(['ADMIN', 'ORGANIZER', 'REFEREE', 'PLAYER']).optional(),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginSchema>;

// ---- Player ----
export const createPlayerSchema = z.object({
  name: z.string().min(2),
  photoUrl: z.string().url().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email().optional(),
  categoryIds: z.array(z.string().uuid()).default([]),
});
export type CreatePlayerDto = z.infer<typeof createPlayerSchema>;

export const updatePlayerSchema = createPlayerSchema.partial();
export type UpdatePlayerDto = z.infer<typeof updatePlayerSchema>;

// ---- Category ----
export const createCategorySchema = z.object({
  name: z.string().min(2),
  type: z.enum(['MALE', 'FEMALE', 'MIXED', 'OPEN']),
  description: z.string().optional(),
});
export type CreateCategoryDto = z.infer<typeof createCategorySchema>;

// ---- Tournament ----
export const createTournamentSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  matchMode: z.enum(['STANDARD', 'PRO']).default('STANDARD'),
  registrationFee: z.number().nonnegative().optional(),
  scheduledAt: z.string().datetime().optional(),
  stageId: z.string().uuid().optional(),
});
export type CreateTournamentDto = z.infer<typeof createTournamentSchema>;

export const registerPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(3).max(8),
});
export type RegisterPlayersDto = z.infer<typeof registerPlayersSchema>;

// ---- Match ----
export const setScoreSchema = z.object({
  a: z.number().int().nonnegative(),
  b: z.number().int().nonnegative(),
  tiebreak: z.boolean().optional(),
});

export const submitMatchResultSchema = z.object({
  sets: z.array(setScoreSchema).min(1).max(3),
});
export type SubmitMatchResultDto = z.infer<typeof submitMatchResultSchema>;

// ---- Circuit ----
export const createCircuitSchema = z.object({
  name: z.string().min(2),
  categoryId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  pointsTable: z.record(z.string(), z.number().nonnegative()).optional(),
});
export type CreateCircuitDto = z.infer<typeof createCircuitSchema>;

export const createStageSchema = z.object({
  name: z.string().min(2),
  stageNumber: z.number().int().positive(),
  scheduledAt: z.string().datetime().optional(),
});
export type CreateStageDto = z.infer<typeof createStageSchema>;

// ---- Payment ----
export const createPaymentSchema = z.object({
  playerId: z.string().uuid(),
  tournamentId: z.string().uuid(),
  amount: z.number().nonnegative(),
  provider: z.string().optional(),
});
export type CreatePaymentDto = z.infer<typeof createPaymentSchema>;

export const updatePaymentStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'CANCELED', 'REFUNDED']),
  providerRef: z.string().optional(),
});
export type UpdatePaymentStatusDto = z.infer<typeof updatePaymentStatusSchema>;

// ---- Sponsor ----
export const createSponsorSchema = z.object({
  name: z.string().min(2),
  logoUrl: z.string().url(),
  link: z.string().url().optional(),
  active: z.boolean().default(true),
  priority: z.number().int().default(0),
});
export type CreateSponsorDto = z.infer<typeof createSponsorSchema>;
