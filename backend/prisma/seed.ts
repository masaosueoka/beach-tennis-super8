import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Dev seed — idempotent where feasible (upsert by unique fields).
 * Run with: npm run seed
 */
async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('[seed] starting...');

  // ---- Admin user ----
  const passwordHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@beach-tennis.local' },
    update: {},
    create: {
      email: 'admin@beach-tennis.local',
      passwordHash,
      name: 'Administrador',
      role: 'ADMIN',
    },
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] admin: ${admin.email} / admin123`);

  // ---- Organizer user ----
  const organizer = await prisma.user.upsert({
    where: { email: 'organizador@beach-tennis.local' },
    update: {},
    create: {
      email: 'organizador@beach-tennis.local',
      passwordHash: await bcrypt.hash('org12345', 10),
      name: 'Organizador Padrão',
      role: 'ORGANIZER',
    },
  });
  // eslint-disable-next-line no-console
  console.log(`[seed] organizer: ${organizer.email} / org12345`);

  // ---- Categories ----
  const categories = await Promise.all(
    [
      { name: 'Masculino C', type: 'MALE' as const },
      { name: 'Feminino C', type: 'FEMALE' as const },
      { name: 'Misto C', type: 'MIXED' as const },
      { name: 'Open', type: 'OPEN' as const },
    ].map((c) =>
      prisma.category.upsert({
        where: { name: c.name },
        update: {},
        create: c,
      }),
    ),
  );
  const [catMasc, catFem] = categories;
  // eslint-disable-next-line no-console
  console.log(`[seed] categories: ${categories.map((c) => c.name).join(', ')}`);

  // ---- Players ----
  const playerNames = [
    'Lucas Silva',
    'Marcos Costa',
    'Pedro Souza',
    'João Almeida',
    'Rafael Lima',
    'Thiago Ribeiro',
    'Bruno Martins',
    'André Pereira',
  ];

  const players = [];
  for (const [i, name] of playerNames.entries()) {
    const slug = name.toLowerCase().replace(/\s+/g, '.');
    const email = `${slug}@beach-tennis.local`;
    const p = await prisma.player.upsert({
      where: { email },
      update: {},
      create: {
        name,
        email,
        phone: `+55 11 90000-000${i}`,
        whatsapp: `+55 11 90000-000${i}`,
        rankingPoints: 0,
        circuitPoints: 0,
      },
    });
    // Attach to Masculino C
    await prisma.playerCategory.upsert({
      where: {
        playerId_categoryId: { playerId: p.id, categoryId: catMasc.id },
      },
      update: {},
      create: { playerId: p.id, categoryId: catMasc.id },
    });
    players.push(p);
  }
  // eslint-disable-next-line no-console
  console.log(`[seed] ${players.length} players created`);

  // ---- Sample Super 8 tournament (DRAFT — ready to start) ----
  const existingTournament = await prisma.tournament.findFirst({
    where: { name: 'Super 8 Amistoso — Masculino C' },
  });
  if (!existingTournament) {
    const t = await prisma.tournament.create({
      data: {
        name: 'Super 8 Amistoso — Masculino C',
        matchMode: 'STANDARD',
        status: 'OPEN',
        maxPlayers: 8,
        registrationFee: 30.0,
        categoryId: catMasc.id,
      },
    });
    await prisma.tournamentPlayer.createMany({
      data: players.slice(0, 8).map((p, i) => ({
        tournamentId: t.id,
        playerId: p.id,
        seedNumber: i + 1,
      })),
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] tournament created: ${t.name} (id=${t.id})`);
  }

  // ---- Circuit with 2 stages ----
  const existingCircuit = await prisma.circuit.findFirst({
    where: { name: 'Circuito Verão 2026 — Masculino C' },
  });
  if (!existingCircuit) {
    const circuit = await prisma.circuit.create({
      data: {
        name: 'Circuito Verão 2026 — Masculino C',
        categoryId: catMasc.id,
        status: 'ACTIVE',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-03-31'),
      },
    });
    await prisma.stage.createMany({
      data: [
        { circuitId: circuit.id, name: 'Etapa 1 — Santos', stageNumber: 1 },
        { circuitId: circuit.id, name: 'Etapa 2 — Guarujá', stageNumber: 2 },
      ],
    });
    // eslint-disable-next-line no-console
    console.log(`[seed] circuit created: ${circuit.name}`);
  }

  // ---- Sample sponsor ----
  await prisma.sponsor.upsert({
    where: { id: 'sponsor-demo' },
    update: {},
    create: {
      id: 'sponsor-demo',
      name: 'Beach Tennis Store',
      logoUrl: 'https://placehold.co/400x200/0ea5e9/ffffff?text=Beach+Tennis',
      link: 'https://example.com',
      active: true,
      priority: 10,
    },
  });
  // eslint-disable-next-line no-console
  console.log('[seed] done.');

  // Silence unused var lint — fem category is exported for future use
  void catFem;
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error('[seed] failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
