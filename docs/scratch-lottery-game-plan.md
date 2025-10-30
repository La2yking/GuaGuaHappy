# Scratch Lottery Game Implementation Plan

**Audience:** Product managers, game designers, frontend & backend engineers, QA, DevOps, data analysts, and AI code generation tools.  
**Version:** 1.0 (2025-10-30)  
**Status:** Ready for development  
**Source Language:** Bilingual (Chinese & English annotations where helpful)

---

## 1. Vision & Scope

Design and implement a single-player scratch lottery (刮刮乐) game where players start with a configurable virtual balance, purchase configurable lottery tickets, experience dynamic encounters, and pursue a configurable target balance. The experience must combine tactile scratching interactions with automated tooling for configuration, analytics, and anti-cheat controls. The system targets desktop and mobile browsers, with potential future extension to connected kiosks.

### 1.1 Goals
- Deliver an engaging, replayable scratch lottery loop that balances surprise and fairness.
- Provide full configurability over ticket types, prize tiers, RTP (return to player), and encounter events.
- Support high fidelity scratch interactions (gesture-based and one-tap reveal).
- Ensure deterministic, auditable outcomes via backend RNG, ticket signatures, and logging.
- Supply tooling (APIs + admin UI) that empowers rapid content iteration and compliance checks.

### 1.2 Success Metrics
- **Engagement:** Average session length ≥ 6 minutes; average scratch count ≥ 8 per session.
- **Retention:** Day-1 returning players ≥ 35% (for casual audience benchmarks).
- **Stability:** 99.9% successful purchase-to-settlement transaction completion.
- **Regulatory readiness:** Audit trail completeness score ≥ 95% in internal reviews.

### 1.3 Out-of-Scope (Phase 1)
- Real-money wagering or fiat payouts (virtual currency only in MVP).
- Multiplayer or synchronous competitive modes.
- Native mobile applications (mobile-responsive web only initially).

---

## 2. Player Experience Overview

### 2.1 Core Loop
1. **Session Start:** Player receives configurable starting balance and sees target balance.
2. **Ticket Browsing:** Player inspects available ticket types (assets, RTP, description, odds snapshot).
3. **Encounter Check:** Before each purchase, system rolls for optional encounter events that offer modifiers or tradeoffs.
4. **Purchase & Ticket Generation:** Balance debited by ticket price; unique ticket instance and QR code issued.
5. **Scratch Interaction:** Player scratches manually (canvas mask) or taps "reveal all". Scratch progress tracked.
6. **Result & Settlement:** Prize (if any) revealed; winnings credited, transactions logged.
7. **Progress Evaluation:** Balance compared against target and bankruptcy thresholds; loop repeats.
8. **Session End:** On victory (balance ≥ target) or loss (balance == 0), player receives summary and leaderboard update.

### 2.2 UX Touchpoints
- Realistic scratch sound & particle FX (configurable toggle).
- Encounter modal with narrative and option buttons.
- Balance change animations (e.g., coin burst into wallet).
- Post-session recap with key stats: total tickets, biggest win, highest balance.

---

## 3. Configurable Domain Model

### 3.1 Entity Summary

| Entity | Description | Key Fields |
|--------|-------------|------------|
| `TicketType` | Configurable template defining pricing, odds, visuals | `name`, `faceValue`, `maxPrize`, `rtpTarget`, `prizeTiers[]`, `mediaRefs`, `description` |
| `TicketInstance` | Concrete ticket purchased by a player | `id`, `ticketTypeId`, `ticketCode`, `qrCodeUrl`, `seed`, `signature`, `status` |
| `GameSession` | Represents one player's run | `id`, `playerId?`, `initialBalance`, `targetBalance`, `balance`, `state`, `stats` |
| `EncounterEvent` | Optional pre-purchase modifiers | `id`, `name`, `triggerChance`, `options[]`, `effects` |
| `Transaction` | Accounting events (purchase, win, fee) | `id`, `sessionId`, `ticketId?`, `delta`, `type`, `timestamp` |
| `AuditLog` | Immutable behavioral record | `id`, `actor`, `action`, `details`, `ip`, `deviceFingerprint`, `signature` |
| `LeaderboardEntry` | Aggregate performance metrics | `playerId`, `bestBalance`, `timestamp`, `metadata` |

### 3.2 `TicketType` Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID / string | ✓ | Unique identifier used in configs & API |
| `name` | string | ✓ | Display name (multi-language support) |
| `faceValue` | number | ✓ | Cost in virtual currency |
| `maxPrize` | number | ✓ | Highest possible win |
| `rtpTarget` | number (0-1) | ✓ | Expected RTP for the ticket batch |
| `ticketLimit` | integer | optional | Max number of tickets concurrently displayed |
| `prizeTiers` | array | ✓ | Sorted high → low prize definitions |
| `prizeTiers[].label` | string | ✓ | UI label (e.g., "Grand Prize") |
| `prizeTiers[].amount` | number | ✓ | Prize value for tier |
| `prizeTiers[].weight` | number | conditional | Probability weight if using dynamic probability |
| `prizeTiers[].count` | integer | conditional | Exact count if using pre-generated pool |
| `mediaRefs` | object | optional | Asset URLs (cover art, scratch layers, icons, audio) |
| `description` | string | optional | Rule text and disclaimers |
| `localeOverrides` | map | optional | Language-specific copies |

### 3.3 `EncounterEvent` Configuration

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique key |
| `name` | string | Title shown to player |
| `triggerChance` | number (0-1) | Probability before each purchase |
| `maxPerSession` | integer | Cap per game to avoid repetition |
| `category` | enum (`price_mod`, `rtp_mod`, `free_ticket`, `risk_reward`, ...) | Used for analytics |
| `options` | array | Player decisions |
| `options[].id` | string | Option key |
| `options[].label` | string | Display text |
| `options[].effect` | JSON | Structured impact (e.g., `{ "priceMultiplier": 2, "rtpMultiplier": 1.5, "appliesToTickets": 1 }`) |
| `options[].cooldown` | integer | How many purchases before the option can reappear |
| `options[].riskDescription` | string | Mandatory clarity on downside |
| `i18n` | object | Multi-language assets |

### 3.4 Relationships & Data Lifecycle
- `TicketType` authored in admin UI → persisted in `ticket_types` table → optionally compiled into ticket pools.
- During purchase: `TicketInstance` minted referencing `TicketType`, seeded RNG, signed with server private key.
- `GameSession` maintains derived stats: `scratchCount`, `maxBalanceAchieved`, `encountersAccepted`, etc.
- `Transactions` link to `TicketInstance` when type is `purchase` or `win`.
- `AuditLog` stores hashed payload (e.g., SHA-256 of ticket data + timestamp) for tamper evidence.

### 3.5 Sample Config Snippet

```json
{
  "ticketTypes": [
    {
      "id": "lucky-10",
      "name": {
        "zh-CN": "幸运10元",
        "en-US": "Lucky ¥10"
      },
      "faceValue": 10,
      "rtpTarget": 0.7,
      "maxPrize": 10000,
      "prizeTiers": [
        { "label": "特等奖", "amount": 10000, "share": 0.1 },
        { "label": "二等奖", "amount": 1000, "share": 0.2 },
        { "label": "三等奖", "amount": 50, "share": 0.7 }
      ],
      "mediaRefs": {
        "cover": "https://cdn.example.com/tickets/lucky10/cover.png",
        "scratchMask": "https://cdn.example.com/tickets/lucky10/mask.png",
        "audioWin": "https://cdn.example.com/audio/win-tier2.mp3"
      },
      "description": "刮开任意三个相同金额即可中奖"
    }
  ],
  "encounterEvents": [
    {
      "id": "double-priced-bonus",
      "name": "双倍价格换超大回报",
      "triggerChance": 0.12,
      "options": [
        {
          "id": "accept",
          "label": "接受挑战",
          "effect": { "priceMultiplier": 2, "rtpMultiplier": 1.4, "modifierDuration": 1 },
          "riskDescription": "若未中奖，扣款翻倍"
        },
        {
          "id": "decline",
          "label": "保守前进",
          "effect": { "noChange": true }
        }
      ]
    }
  ],
  "game": {
    "initialBalance": 1000,
    "targetBalance": 5000,
    "maxSessionsPerDay": 5,
    "leaderboardSize": 100
  }
}
```

### 3.6 Probability & RTP Computation

**Terminology**  
- `P`: Ticket price (face value).  
- `N`: Ticket pool size (number of tickets minted).  
- `A_i`: Award amount for prize tier *i*.  
- `w_i`: Weight or count for prize tier *i*.  
- `RTP`: Target payout ratio (Σ expected payouts / Σ sales).

**Workflow:**
1. Determine `N` (default 100,000) or compute probabilities analytically.
2. For each tier, allocate portion of total payout budget: `budget_i = RTP * N * P * tierShare_i`.
3. Derive expected wins `E_i = floor(budget_i / A_i)`.
4. Probability `p_i = E_i / N`. The non-winning probability is `1 - Σ p_i`.
5. Validate: `Σ (p_i * A_i) ≈ RTP * P`. Adjust shares iteratively until difference ≤ tolerance (e.g., 0.1%).

**Pseudocode:**
```ts
function buildPrizeDistribution(ticket: TicketType, poolSize = 100000) {
  const totalSales = poolSize * ticket.faceValue;
  const payoutTarget = totalSales * ticket.rtpTarget;
  return ticket.prizeTiers.map(tier => {
    const tierBudget = payoutTarget * tier.share;
    const expectedWins = Math.floor(tierBudget / tier.amount);
    return {
      ...tier,
      probability: expectedWins / poolSize,
      expectedWins
    };
  });
}
```

---

## 4. Gameplay Flow & UX Specifications

### 4.1 Scene Layout
- **Background:** Storefront interior with ambient animation (looped).
- **Ticket Display:** Carousel/grid of ticket cards with hover/tooltip details.
- **Player Panel:** Top bar showing avatar, current balance, max balance, target progress bar, scratch count.
- **Tool Tray:** Bottom toolbar with scratch tool selector (coin, brush, auto), encounter icon, history/log button.
- **Modal Framework:** Encounter windows, purchase confirmation, results, settings.

### 4.2 Interaction States
1. **Idle/Browsing** – Player selects ticket; CTA button `购买` (Buy).
2. **Encounter Pending** – If triggered, modal overlays with options (primary, secondary). Accept/decline updates modifiers.
3. **Purchase Confirmation** – Deducts face value; displays ticket instantiation details and QR code (for potential redemption or audit).
4. **Scratch Mode** – Canvas overlay, scratch progress tracked via mask reveal %. Provide haptic feedback for mobile.
5. **Result Display** – Win: celebratory animation, amount overlay, leaderboard update preview. Loss: subtle fade-out.
6. **Post-Result Decision** – Buttons: `继续刮` (Continue), `查看记录` (View Log), `结束本局` (End Session).

### 4.3 Scratch Implementation Notes
- Utilize `<canvas>` with compositing to erase mask using pointer/touch move events.
- Threshold: once 70% of mask removed trigger auto reveal (with effect) to streamline flow.
- Accessibility: Provide auto-reveal for players with motor impairments; ensure ARIA labels + keyboard fallback.
- Performance: Use requestAnimationFrame and limit brush radius adjustments to maintain 60fps on low-end devices.

### 4.4 Tools & Modifiers
- **Coin Tool:** Default, medium brush radius.
- **Brush Tool:** Smaller radius, more precise, slower reveal.
- **Turbo Tool:** Available after unlocking (achievement), large radius.
- **One-Tap Reveal:** Always available; bypasses manual scratch and plays reveal animation.

### 4.5 Logging & Cheat Prevention in UI
- Track `scratchEvents` (timestamped) to detect bots (e.g., unrealistic scraping speed).
- Hash scratch path client-side, send to backend for verification.
- Prevent double submissions by gating UI while result processing.

### 4.6 Localization & Theming
- Strings externalized (i18n library).  
- Theme packs allow seasonal skins (colors, backgrounds, sound packs).  
- Layout supports LTR/RTL toggles.

---

## 5. Encounter Event System

### 5.1 Trigger Mechanics
- On ticket purchase request, compute random float `r ∈ [0,1)`. If `r < triggerChance` and `maxPerSession` not reached, present encounter.
- Encounters may stack modifiers (e.g., price multiplier and RTP boost) stored in session state with TTL.

### 5.2 Option Effects
Supported fields in `effect` payload (extendable):
- `priceMultiplier`, `priceOffset`
- `rtpMultiplier`, `bonusProbability`
- `freeTickets`: integer count granted
- `nextTicketTypeOverride`: specific ticket for next purchase
- `cooldownPurchases`: count before effect can recur
- `balanceBonus`: immediate currency adjustments
- `risk`: structured risk descriptor for analytics

### 5.3 Sample Encounter Flow
```
[Player Chooses Ticket]
        |
        v
[Encounter Trigger Roll]
        |
   ┌────┴────┐
   |         |
  Yes        No
   |          \
[Modal]      [Proceed to Purchase]
   |
[Player Chooses Option]
   |
[Apply Modifier]
   |
[Purchase -> Ticket Generation]
```

### 5.4 Content Management
- Encounter definitions stored in `encounter_events` table with JSONB payload for options.
- Admin UI must provide slider for probability, numeric inputs for multipliers, WYSIWYG editor for narratives.

---

## 6. System Architecture

### 6.1 Frontend (Suggested Stack: React + TypeScript + Zustand/Redux Toolkit)
- **Layers:**
  - **App Shell:** Router, layout, localization, error boundaries.
  - **State Management:** Session store (balance, modifiers), ticket catalog store, encounter store.
  - **Services:** REST client, WebSocket (future for live updates), asset preloader.
  - **Scratch Engine:** Canvas component with mask renderer, pointer event manager, scratch analytics.
  - **UI Components:** TicketCard, EncounterModal, PurchaseDialog, ResultOverlay, LeaderboardPanel, LogDrawer.
- **Build Tooling:** Vite/Next.js (SSG), ESLint + Prettier, unit tests via Vitest/Jest, Playwright for E2E scratch flows.
- **Offline Support:** Cache static assets via service worker (PWA optional in later phase).

### 6.2 Backend (Suggested Stack: Node.js 20 + NestJS or Fastify + TypeScript)
- **Modules:**
  - `AuthModule` (optional for MVP; session token issuance).
  - `GameSessionModule`: start/end sessions, maintain state.
  - `TicketModule`: CRUD for ticket types, purchase flow, RNG integration.
  - `EncounterModule`: selection logic, effect application.
  - `SettlementModule`: apply winnings, write transactions.
  - `LoggingModule`: writes audit logs to DB + external log pipeline.
  - `AnalyticsModule`: aggregates metrics, pushes to Kafka/Kinesis if available.
- **Services:**
  - RNG service using `crypto.randomInt`, optionally hardware RNG integration.
  - Signature service using ECDSA (e.g., secp256k1) to sign ticket payloads.
  - QR Code service (generate PNG/SVG on the fly with signed payload).
- **Security:** JWT session tokens, rate limiting (per IP & per device), WAF compatibility.

### 6.3 Infrastructure
- **Database:** PostgreSQL 15 with schema as outlined in Section 7.2.  
- **Cache:** Redis for session state, encounter cooldowns, leaderboard caching.  
- **Object Storage:** CDN-backed bucket for ticket assets.  
- **Containerization:** Docker images (multistage builds).  
- **CI/CD:** GitHub Actions (build, test, deploy).  
- **Observability:** Prometheus metrics + Grafana dashboards; centralized logging with ELK or OpenSearch.

---

## 7. API Design

### 7.1 Authentication & Headers
- Sessions can be anonymous (UUID) or bound to logged-in user. Token issued at session start.
- All requests require `X-Session-Id` and `X-Signature` (HMAC) for tamper detection.
- Responses include `requestId` for tracing.

### 7.2 Database Schema (Proposed)

```sql
CREATE TABLE ticket_types (
  id UUID PRIMARY KEY,
  name JSONB NOT NULL,
  face_value NUMERIC(12,2) NOT NULL,
  max_prize NUMERIC(12,2) NOT NULL,
  rtp_target NUMERIC(5,4) NOT NULL,
  prize_tiers JSONB NOT NULL,
  ticket_limit INT,
  media_refs JSONB,
  description TEXT,
  locale_overrides JSONB,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE ticket_pools (
  id UUID PRIMARY KEY,
  ticket_type_id UUID REFERENCES ticket_types(id),
  pool_size INT NOT NULL,
  distribution JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  status TEXT CHECK (status IN ('ready','active','exhausted'))
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  ticket_type_id UUID REFERENCES ticket_types(id),
  pool_id UUID REFERENCES ticket_pools(id),
  ticket_code TEXT UNIQUE NOT NULL,
  qr_code_url TEXT,
  seed BYTEA NOT NULL,
  signature BYTEA NOT NULL,
  assigned_session UUID,
  status TEXT CHECK (status IN ('minted','sold','scratched','redeemed','void')),
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE game_sessions (
  id UUID PRIMARY KEY,
  player_id UUID,
  start_balance NUMERIC(12,2) NOT NULL,
  target_balance NUMERIC(12,2) NOT NULL,
  current_balance NUMERIC(12,2) NOT NULL,
  max_balance NUMERIC(12,2) NOT NULL,
  scratch_count INT DEFAULT 0,
  encounter_count INT DEFAULT 0,
  state TEXT CHECK (state IN ('active','won','lost','terminated')),
  started_at TIMESTAMP DEFAULT now(),
  finished_at TIMESTAMP
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id),
  ticket_id UUID REFERENCES tickets(id),
  amount_change NUMERIC(12,2) NOT NULL,
  type TEXT CHECK (type IN ('purchase','win','encounter_fee','bonus','refund')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE encounter_events (
  id UUID PRIMARY KEY,
  definition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE session_encounter_logs (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES game_sessions(id),
  encounter_id UUID REFERENCES encounter_events(id),
  option_id TEXT,
  effect JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor TEXT,
  action TEXT,
  details JSONB,
  ip_address INET,
  device_fingerprint TEXT,
  signature BYTEA,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE leaderboard (
  player_id UUID PRIMARY KEY,
  best_balance NUMERIC(12,2),
  achieved_at TIMESTAMP,
  metadata JSONB
);
```

### 7.3 REST Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/api/game/start-session` | Initialize session with balances; returns session token |
| `GET` | `/api/game/ticket-types` | Fetch active ticket catalog |
| `POST` | `/api/game/purchase` | Purchase ticket, apply encounter modifiers |
| `POST` | `/api/game/scratch` | Submit scratch completion event, settle winnings |
| `POST` | `/api/game/event-choice` | Record encounter choice, update modifiers |
| `GET` | `/api/game/session-summary` | Retrieve session stats (for resume or end screen) |
| `GET` | `/api/leaderboard/top` | Fetch leaderboard entries |
| `POST` | `/api/admin/ticket-type` | Create/update ticket type |
| `POST` | `/api/admin/generate-pool` | Generate ticket pool with distribution |
| `GET` | `/api/admin/pool-status` | Inspect pool depletion |
| `GET` | `/api/admin/logs` | Query audit logs with filters |

#### 7.3.1 `POST /api/game/start-session`
Request:
```json
{
  "playerId": "optional-uuid",
  "initialBalance": 1000,
  "targetBalance": 5000,
  "locale": "zh-CN",
  "deviceInfo": {
    "platform": "web",
    "fingerprint": "hash"
  }
}
```
Response:
```json
{
  "sessionId": "8d6...",
  "token": "jwt-token",
  "balance": 1000,
  "targetBalance": 5000,
  "maxBalance": 1000,
  "ticketTypes": [ /* condensed catalog */ ],
  "encounterModifiers": []
}
```

#### 7.3.2 `POST /api/game/purchase`
Request:
```json
{
  "sessionId": "8d6...",
  "ticketTypeId": "lucky-10",
  "encounterModifiers": ["double-priced-bonus"],
  "paymentSignature": "client-hmac"
}
```
Response:
```json
{
  "ticket": {
    "id": "b9f...",
    "ticketCode": "TCK-20251030-000001",
    "qrCodeUrl": "https://...",
    "media": { "front": "...", "mask": "..." },
    "prizeTiers": [ /* for display */ ]
  },
  "balance": 980,
  "encounter": {
    "id": "lucky-charms",
    "options": [ /* present if triggered post-purchase */ ]
  },
  "transactionId": "trx-12345"
}
```

#### 7.3.3 `POST /api/game/scratch`
Request:
```json
{
  "sessionId": "8d6...",
  "ticketId": "b9f...",
  "scratchProof": {
    "coverage": 0.85,
    "pathHash": "sha256:c8da...",
    "elapsedMs": 4200
  }
}
```
Response:
```json
{
  "isWin": true,
  "prizeAmount": 1000,
  "balance": 1980,
  "maxBalance": 1980,
  "signature": "server-signed-payload",
  "transactionId": "trx-67890",
  "leaderboardUpdated": false
}
```

---

## 8. Logging, Analytics, and Anti-Cheat

### 8.1 Player Behavior Logging
- Capture purchase timestamp, ticket ID, outcome, price, modifiers applied.
- Append IP address, device fingerprint, session ID, request ID.
- Store hashed scratch path for tamper detection.

### 8.2 Anti-Cheat Signals
- **Velocity Alerts:** > `X` purchases within `Y` seconds.
- **Win Rate Deviation:** Player win rate exceeding mean by configurable standard deviation.
- **Device Collisions:** Multiple accounts using same fingerprint with high success.
- **Integrity Checks:** Verify ticket signature, encounter effect boundaries, and scratch coverage thresholds.

### 8.3 Monitoring Dashboards
- Transactions per minute, failed purchases, average RTP realized vs target, number of encounter triggers, top modifiers selected.
- Alert thresholds for anomaly detection via Prometheus or Grafana alerts.

### 8.4 Compliance Storage
- Store logs for ≥ 365 days in immutable storage (e.g., WORM-compliant bucket).
- Provide export pipeline (CSV/Parquet) for regulatory review.

---

## 9. Testing Strategy

| Test Type | Focus | Tooling |
|-----------|-------|---------|
| Unit Tests | RNG correctness, session balance math, encounter modifiers | Jest/Vitest, Supertest |
| Integration | Purchase → Scratch → Settlement, pool depletion logic | NestJS testing module, Dockerized Postgres |
| UI/E2E | Scratch gesture, encounter flow, responsive layout | Playwright + mocking APIs |
| Load Testing | Purchase peak (1000 req/s), scratch settlement latency | k6 or Locust |
| Security | Signature verification, rate limit, replay attack prevention | OWASP ZAP, custom scripts |

Regression gates must run in CI before deployment. Implement smoke tests post-deploy.

---

## 10. Deployment & Operations

- **Environments:** `dev`, `staging`, `prod` with separate DBs and secrets.
- **Secrets Management:** Vault or AWS Secrets Manager; rotate signing keys quarterly.
- **CD Pipeline:** Build → Test → Security Scan → Deploy via ArgoCD or GitHub Actions.
- **Scalability:** Horizontal autoscaling of API pods (HPA), CDN caching of static assets.
- **Disaster Recovery:** Daily DB backups, cross-region replication optional.

---

## 11. Legal & Compliance

- Enforce age gating if deploying in jurisdictions requiring it.
- Provide responsible play messaging and cooldown tips.
- Ensure privacy policy covers data capture; allow opt-out where required (GDPR/CCPA).
- Offer audit logs to licensed auditors with handshake + signature verification.

---

## 12. Roadmap & Milestones

| Milestone | Scope | Target Date |
|-----------|-------|-------------|
| M0 | Finalize specs, sign-off from stakeholders | +1 week |
| M1 | Backend MVP: session, purchase, scratch settlement, logging | +5 weeks |
| M2 | Frontend MVP: ticket browsing, scratch interaction, encounter modals | +8 weeks |
| M3 | Admin Portal: ticket type CRUD, pool monitor | +10 weeks |
| M4 | Beta Release: analytics dashboards, anti-cheat alerts | +12 weeks |
| M5 | Launch: production readiness, load testing, compliance audit | +14 weeks |

---

## 13. Future Enhancements

- Player accounts with cross-session persistence, achievements, cosmetics.
- Social features: friend leaderboards, shareable win replays.
- Seasonal events with dynamic odds (within regulatory limits).
- Real-money redemption and on-chain ticket verification (subject to compliance).
- AI-based encounter generator that tunes offers based on player risk profile.

---

## 14. Appendix A: State Machine

| State | Entry Conditions | Actions | Exit Condition |
|-------|------------------|---------|----------------|
| `Browsing` | Session active | Display catalog, polls encounter trigger | Player selects ticket |
| `EncounterPending` | Encounter triggered | Show modal, apply option effect | Player choice logged |
| `Purchasing` | Encounter resolved | Validate balance, debit, mint ticket | Ticket minted |
| `Scratching` | Ticket minted | Render scratch canvas, track coverage | Scratch coverage ≥ threshold |
| `Settling` | Scratch complete | Compute prize, credit balance, log transaction | Settlement success |
| `Evaluating` | Post settlement | Update win/loss status, update stats | Game end or return to `Browsing` |
| `Ended` | Balance ≥ target OR = 0 | Show summary, update leaderboard | Player restarts or exits |

---

## 15. Appendix B: Glossary
- **RTP (Return to Player):** Expected percentage of wagered money returned to player over long run.
- **Ticket Pool:** Pre-generated batch of tickets with fixed prize distribution.
- **Encounter:** Random event offering optional modifier affecting next purchase(s).
- **Scratch Proof:** Client-submitted evidence that scratching action occurred legitimately.
- **Signature:** Cryptographic proof tying ticket outcome to server decision, preventing falsification.

---

**Document Control:** Updates require approval from Product (owner), Tech Lead, Compliance Officer. Track revisions via Git tags/releases.
