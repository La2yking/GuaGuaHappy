# Scratch Lottery Game Documentation

This repository contains the implementation plan and configuration assets for a configurable, single-player scratch lottery ("刮刮乐") game experience.

## Contents

- [`docs/scratch-lottery-game-plan.md`](docs/scratch-lottery-game-plan.md): Comprehensive product and engineering specification covering gameplay, system design, APIs, data models, and operational requirements.
- [`docs/config-schema.yaml`](docs/config-schema.yaml): Machine-readable configuration schema to bootstrap implementation or AI-assisted code generation.

## Usage

1. Review the implementation plan to understand business goals, gameplay loop, technical architecture, and delivery milestones.
2. Leverage the configuration schema when generating scaffolding code, validations, or management tooling.
3. Extend this repository with source code, additional documentation, and assets as the project progresses.

## Current Implementation

- **Backend service (Node.js + Fastify):** Located under `src/`. Provides session management, ticket purchases, encounter resolution, and prize roll logic following the product specification.
- **Configuration loader:** Validates YAML/JSON configs against a zod schema and exposes typed access to ticket definitions and encounter events.
- **Domain services:** In-memory session store, encounter engine, and prize distribution utilities implementing RTP and modifier handling.

See `config/default-config.yaml` for the sample runtime configuration powering the default service bootstrapping.

## Local Development

1. Install dependencies with `npm install`.
2. Start the API server in watch mode with `npm run dev` (requires Node.js 20+).
3. Build production assets with `npm run build` and run the compiled server via `npm start`.

The Fastify server defaults to `http://localhost:3000` and exposes the following endpoints:

- `GET /health` – Service health snapshot.
- `GET /config/tickets` – Configured ticket catalog and prize distribution summary.
- `POST /sessions` – Create a new scratch session (optionally provide `playerId`).
- `GET /sessions/:id` – Inspect session state, balance, transactions, and encounter history.
- `POST /sessions/:id/purchase` – Attempt a ticket purchase; handles encounter gating, RNG prize settlement, and state transitions.
