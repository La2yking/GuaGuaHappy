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

## Prerequisites

- **Node.js 20 or newer** (the project targets the modern NodeNext runtime).
- **npm 9+** (bundled with the Node.js installer).
- (Optional) A custom configuration file – point the service at it with `CONFIG_PATH=/path/to/config.yaml`.

## Local Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the API server in watch mode (restarts on file changes):
   ```bash
   npm run dev
   ```
   The server boots on `http://localhost:3000` and logs structured Fastify output when ready.
3. To stop the server, press `Ctrl + C` in the terminal.

### Running with a custom configuration

The service loads `config/default-config.yaml` by default. To use a different configuration, provide the absolute or relative path via the `CONFIG_PATH` environment variable:

```bash
CONFIG_PATH=./config/my-playtest.yaml npm run dev
```

## Gameplay Quickstart (API Walkthrough)

Once the server is running, interact with the game through the REST API. The examples below use `curl`, but any HTTP client (Postman, Insomnia, Thunder Client, etc.) works.

1. **Check server health**
   ```bash
   curl http://localhost:3000/health
   ```

2. **Create a new player session**
   ```bash
   curl -X POST http://localhost:3000/sessions \
     -H "Content-Type: application/json" \
     -d '{"playerId":"demo-player"}'
   ```
   Save the returned `session.id` for subsequent calls.

3. **Inspect available tickets**
   ```bash
   curl http://localhost:3000/config/tickets
   ```

4. **Purchase (scratch) a ticket**
   ```bash
   curl -X POST http://localhost:3000/sessions/<SESSION_ID>/purchase \
     -H "Content-Type: application/json" \
     -d '{"ticketTypeId":"lucky-10"}'
   ```
   - If the response contains `"status": "completed"`, the purchase resolved immediately and the ticket outcome is included.
   - If the response contains `"status": "encounter_required"`, an encounter must be resolved before the purchase completes.

5. **Resolve an encounter (if required)**
   Use one of the option IDs returned in the encounter payload:
   ```bash
   curl -X POST http://localhost:3000/sessions/<SESSION_ID>/purchase \
     -H "Content-Type: application/json" \
     -d '{
       "ticketTypeId": "lucky-10",
       "encounterOptionId": "accept"
     }'
   ```
   The response now includes both the encounter resolution summary and the ticket result.

6. **Review session progress**
   ```bash
   curl http://localhost:3000/sessions/<SESSION_ID>
   ```
   The session payload lists balance changes, transactions, awarded tickets, pending encounters, and whether the player has reached the win or loss condition.

## Production Build & Run

1. Compile TypeScript to JavaScript:
   ```bash
   npm run build
   ```
2. Launch the compiled server:
   ```bash
   npm start
   ```
   Set `PORT` and `HOST` environment variables to override the defaults (`3000` / `0.0.0.0`).

The Fastify server exposes the following routes by default:

- `GET /health` – Service health snapshot.
- `GET /config/tickets` – Configured ticket catalog and prize distribution summary.
- `POST /sessions` – Create a new scratch session (optionally provide `playerId`).
- `GET /sessions/:id` – Inspect session state, balance, transactions, and encounter history.
- `POST /sessions/:id/purchase` – Attempt a ticket purchase; handles encounter gating, RNG prize settlement, and state transitions.
