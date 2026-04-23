# Beach Tennis Super 8

Production-ready tournament management system for Beach Tennis Super 8 competitions and multi-stage circuits. Real-time standings, match scoring with two rule sets (STANDARD / PRO), per-category and circuit-wide rankings, WhatsApp-ready image cards, payments, push notifications, and sponsor management.

## Stack

- **Backend:** Node.js + Express, TypeScript, Clean Architecture (Domain / Application / Infrastructure / Presentation layers)
- **Database:** PostgreSQL via Prisma ORM
- **Auth:** JWT (bcrypt-hashed passwords) with role-based access (`ADMIN`, `ORGANIZER`, `REFEREE`, `PLAYER`)
- **Real-time:** Socket.IO over the same HTTP server, with rooms per tournament / circuit / category / user
- **Object storage:** S3-compatible (AWS S3, Minio, R2, Backblaze) via presigned upload URLs
- **Image generation:** `node-canvas` rendering 1080×1080 WhatsApp-ready PNG cards for top-5 rankings and Super 8 standings
- **Frontend:** Next.js 14 (App Router) + Tailwind CSS, Zustand for auth state, Socket.IO client for live updates
- **Container:** Multi-stage Dockerfiles, single `docker-compose.yml` for the whole stack

## Architecture at a glance

```
backend/src/
├── domain/                 # Pure, framework-free business rules (ZERO infra imports)
│   ├── entities/           # Types and value objects
│   ├── errors/             # Domain error hierarchy
│   └── services/           # Match scoring, Super 8 engine, standings, circuit scoring
├── application/
│   ├── dto/                # Zod schemas
│   └── use-cases/          # Orchestrators — inject repositories via constructor
├── infrastructure/
│   ├── database/           # Prisma client singleton + event bus + listener bootstrap
│   ├── repositories/       # Prisma-backed persistence
│   ├── websocket/          # Socket.IO gateway
│   ├── storage/            # S3 presigned upload
│   ├── image-generator/    # WhatsApp card rendering (node-canvas)
│   ├── payment/            # Payment service (provider-agnostic interface)
│   └── notifications/      # DB + Web Push fan-out
└── presentation/
    ├── middleware/         # auth (JWT) + error handler
    ├── controllers/        # Thin HTTP handlers
    └── routes/             # Express routers
```

All domain mutations emit events onto an in-process `eventBus`. Listeners handle cross-module side effects (circuit recompute, push notifications, WebSocket broadcasts). Swap the bus implementation for Redis/NATS when moving to a distributed deployment — no other layer changes.

## Core rules

### Super 8 format
- 3–8 players per tournament; 8 players → 28 matches across 7 rounds (round-robin via circle method)
- Drawn order is seeded for reproducibility
- Every pair plays exactly once

### Match modes
- **STANDARD:** best of 3 sets. Sets end at 6 games (win by 2); 7–5 valid; 7–6 requires tiebreak flag.
- **PRO:** best of 2 sets. If sets split 1–1, a super tiebreak to 10 (win by 2; margin exactly 2 when above 10) decides the match.

### Ranking tiebreakers (in order)
1. Points (3 per win)
2. Sets won
3. Set difference
4. Game difference
5. Head-to-head among tied subset
6. Seed number (stable fallback)

### Points awarded on tournament finish
- Per-category (hardcoded): `1→100, 2→70, 3→50, 4→35, 5→25, 6→15, 7→10, 8→5`
- Per-circuit (configurable `pointsTable` JSON on the `Circuit` model); default matches FIVB-style scales

## Running locally with Docker

Prerequisites: Docker + Docker Compose.

```bash
# 1. Clone and enter the repo
cd beach-tennis-super8

# 2. Copy env files and adjust as needed
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 3. (Optional) Generate VAPID keys for Web Push
npx -y web-push generate-vapid-keys
# Paste the output into backend/.env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)

# 4. Boot the stack
docker compose up --build
```

This brings up:
- `postgres` — Postgres 16 on `:5432`
- `minio` — S3-compatible storage on `:9000` (console at `:9001`, creds `minioadmin` / `minioadmin`)
- `minio-init` — one-shot job that creates the `beach-tennis` bucket
- `backend` — Express + Socket.IO on `:4000`, runs `prisma migrate deploy` on startup
- `frontend` — Next.js on `:3000`

Open http://localhost:3000.

### Seeding dev data

```bash
docker compose exec backend npx tsx prisma/seed.ts
```

Or from the host, pointed at the containerized DB:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run seed
```

Seed credentials:
- Admin: `admin@beach-tennis.local` / `admin123`
- Organizer: `organizer@beach-tennis.local` / `organizer123`

## Running without Docker (dev mode)

```bash
# Start a Postgres instance (14+)
# Export DATABASE_URL pointing at it

cd backend
npm install
cp .env.example .env
# Edit DATABASE_URL in .env

npx prisma migrate dev
npm run seed
npm run dev          # → http://localhost:4000  (ws path: /ws)

# In another terminal:
cd frontend
npm install
cp .env.example .env
npm run dev          # → http://localhost:3000
```

## API surface

All endpoints are under `/api`. Public routes are readable anonymously; writes require a `Bearer <JWT>` header.

### Auth
- `POST /api/auth/register` — `{ email, password, name, role? }` → `{ token, user }`
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`

### Players / Categories (public read)
- `GET  /api/players?categoryId=&active=&search=`
- `GET  /api/players/:id`
- `POST /api/players`              *(ADMIN, ORGANIZER)*
- `PATCH /api/players/:id`         *(ADMIN, ORGANIZER)*
- `GET  /api/categories`
- `POST /api/categories`           *(ADMIN, ORGANIZER)*
- `PATCH /api/categories/:id`      *(ADMIN, ORGANIZER)*
- `DELETE /api/categories/:id`     *(ADMIN)*

### Tournaments
- `GET  /api/tournaments?status=&categoryId=`
- `GET  /api/tournaments/:id`
- `GET  /api/tournaments/:id/standings`
- `GET  /api/tournaments/:id/matches`
- `POST /api/tournaments`                       *(ADMIN, ORGANIZER)*
- `PATCH /api/tournaments/:id`                  *(ADMIN, ORGANIZER)*
- `POST /api/tournaments/:id/players`           *(ADMIN, ORGANIZER)* — register 3–8 players in seed order
- `POST /api/tournaments/:id/start`             *(ADMIN, ORGANIZER)* — draws bracket, generates schedule
- `POST /api/tournaments/matches/:matchId/result` *(ADMIN, ORGANIZER, REFEREE)*

### Rankings / Circuits / Payments / Sponsors / Notifications / Storage / Images
- `GET  /api/rankings/top?limit=` — global top
- `GET  /api/rankings/circuit/top?limit=` — circuit top
- `GET  /api/rankings/category/:categoryId`
- `GET  /api/circuits`, `/api/circuits/:id`, `/api/circuits/:id/ranking`
- `POST /api/circuits`, `PATCH /api/circuits/:id`, `POST /api/circuits/:id/stages` *(ADMIN, ORGANIZER)*
- `POST /api/payments`, `PATCH /api/payments/:id/status`, `GET /api/payments/tournament/:tournamentId`
- `GET /api/sponsors` — active only; `POST /api/sponsors` etc. for admins
- `GET /api/notifications/vapid-key`, `GET /api/notifications`, `POST /api/notifications/push/subscribe`
- `POST /api/storage/presign` *(ADMIN, ORGANIZER)* → returns presigned PUT URL
- `GET /api/images/ranking/top5.png`
- `GET /api/images/circuits/:id/top5.png`
- `GET /api/images/categories/:id/top5.png`
- `GET /api/images/tournaments/:id/standings.png`

### WebSocket

Socket.IO path: `/ws`. Auth via `socket.handshake.auth.token` (optional).

Emit from client to subscribe:
- `subscribe:tournament` `<tournamentId>`
- `subscribe:circuit` `<circuitId>`
- `subscribe:category` `<categoryId>`
- `subscribe:user` (uses auth token)

Server-emitted events:
- `match.finished`, `standings.updated`, `tournament.finished`
- `ranking.updated`, `circuit.ranking.updated`, `stage.finished`
- `payment.updated`

## Testing

```bash
cd backend
npm test
```

The domain layer is fully tested in isolation — match scoring rules (STANDARD + PRO + super tiebreak edge cases), Super 8 round-robin generation, standings tiebreakers, and circuit aggregation. **41 tests pass** out of the box.

## Deployment notes

- **Canvas native deps.** The backend Dockerfile installs Cairo, Pango, libjpeg, giflib, and librsvg — required by `node-canvas` for the image generator. If you're deploying to a managed platform that doesn't expose apt, use `node:20-bookworm-slim` or a similar full base.
- **Prisma migrations.** The `backend` container runs `prisma migrate deploy` before boot. Commit your migrations — do not rely on `migrate dev` in production.
- **Scale-out.** The domain event bus is in-process (`EventEmitter`). When running more than one backend replica, replace `infrastructure/database/event-bus.ts` with a Redis pub/sub adapter — the rest of the stack (use cases, WebSocket gateway, listeners) needs no changes thanks to the interface boundary.
- **Object storage.** Minio is used locally. Point `S3_ENDPOINT` and credentials at your cloud provider for production, and flip `S3_FORCE_PATH_STYLE=false` for AWS.
- **Push keys.** Generate VAPID keys once, store them in your secrets manager, and expose the public key on `/api/notifications/vapid-key` so the frontend can register service-worker subscriptions.

## Project layout

```
beach-tennis-super8/
├── backend/
│   ├── prisma/              # schema.prisma + seed.ts
│   ├── src/                 # See "Architecture" above
│   ├── tests/               # Jest — 41 domain tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # AppShell, PlayerCard, ScoreInput
│   │   ├── hooks/           # useSocket
│   │   ├── lib/             # api, auth
│   │   └── types/           # Shared API types
│   └── package.json
├── docker/
│   ├── Dockerfile.backend   # Multi-stage; installs canvas deps
│   └── Dockerfile.frontend  # Next.js standalone
├── docker-compose.yml
└── README.md
```

## License

MIT
