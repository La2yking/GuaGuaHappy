export type LocaleStringMap = Record<string, string>;

export interface PrizeTier {
  label: string;
  amount: number;
  share?: number;
  weight?: number;
  count?: number;
  metadata?: Record<string, unknown>;
}

export interface TicketType {
  id: string;
  name: LocaleStringMap;
  faceValue: number;
  rtpTarget: number;
  maxPrize: number;
  ticketLimit?: number;
  prizeTiers: PrizeTier[];
  mediaRefs?: Record<string, string>;
  description?: string;
  localeOverrides?: Record<string, unknown>;
}

export interface EncounterOptionEffect {
  priceMultiplier?: number;
  priceOffset?: number;
  rtpMultiplier?: number;
  bonusProbability?: number;
  freeTickets?: number;
  nextTicketTypeOverride?: string;
  modifierDuration?: number;
  balanceBonus?: number;
  balancePenalty?: number;
  cooldownPurchases?: number;
  metadata?: Record<string, unknown>;
}

export interface EncounterOption {
  id: string;
  label: string;
  effect: EncounterOptionEffect;
  riskDescription?: string;
  cooldown?: number;
  telemetryTags?: string[];
}

export interface EncounterEvent {
  id: string;
  name: string;
  triggerChance: number;
  maxPerSession?: number;
  category?: string;
  narrative?: LocaleStringMap;
  options: EncounterOption[];
  metadata?: Record<string, unknown>;
}

export interface GameAnalyticsConfig {
  provider?: string;
  stream?: string;
  customDimensions?: string[];
}

export interface AntiCheatConfig {
  purchaseVelocityThreshold?: number;
  winRateStdDevLimit?: number;
  scratchCoverageThreshold?: number;
  flaggingActions?: string[];
}

export interface GameSettings {
  initialBalance: number;
  targetBalance: number;
  minPurchaseIntervalMs?: number;
  maxSessionsPerDay?: number;
  leaderboardSize?: number;
  locale?: string;
  analytics?: GameAnalyticsConfig;
  antiCheat?: AntiCheatConfig;
}

export interface GameConfig {
  ticketTypes: TicketType[];
  encounterEvents?: EncounterEvent[];
  game: GameSettings;
}

export type TransactionType =
  | 'purchase'
  | 'win'
  | 'encounter_bonus'
  | 'encounter_penalty'
  | 'free_ticket';

export interface Transaction {
  id: string;
  sessionId: string;
  ticketId?: string;
  type: TransactionType;
  delta: number;
  balanceAfter: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export type SessionState = 'active' | 'won' | 'lost' | 'terminated';

export interface TicketInstance {
  id: string;
  ticketTypeId: string;
  code: string;
  seed: string;
  signature: string;
  createdAt: string;
  prizeAwarded?: number;
  prizeTierLabel?: string;
  metadata?: Record<string, unknown>;
}

export interface EncounterEventSnapshot extends EncounterEvent {
  options: EncounterOption[];
}

export interface PendingEncounterContext {
  event: EncounterEventSnapshot;
  triggeredAt: string;
}

export interface EncounterHistoryEntry {
  eventId: string;
  optionId?: string;
  triggeredAt: string;
  resolvedAt?: string;
  outcome?: 'selected' | 'skipped' | 'expired';
  metadata?: Record<string, unknown>;
}

export interface PurchaseModifierEffect {
  priceMultiplier?: number;
  priceOffset?: number;
  rtpMultiplier?: number;
}

export interface AggregatedPurchaseModifiers {
  priceMultiplier: number;
  priceOffset: number;
  rtpMultiplier: number;
}

export interface ActiveModifier {
  id: string;
  effect: PurchaseModifierEffect;
  remainingPurchases: number;
  appliedAt: string;
}

export interface SessionEncounterTracker {
  counts: Record<string, number>;
  optionCooldowns: Record<string, number>;
  history: EncounterHistoryEntry[];
}

export interface GameSession {
  id: string;
  playerId?: string;
  initialBalance: number;
  targetBalance: number;
  balance: number;
  maxBalance: number;
  scratchCount: number;
  encounterCount: number;
  state: SessionState;
  startedAt: string;
  finishedAt?: string;
  transactions: Transaction[];
  tickets: TicketInstance[];
  pendingEncounter?: PendingEncounterContext;
  activeModifiers: ActiveModifier[];
  freeTicketsRemaining: number;
  encounterTracker: SessionEncounterTracker;
  lastPurchaseAt?: number;
}

export interface PrizeDistributionEntry extends PrizeTier {
  probability: number;
  expectedWins?: number;
}

export interface PrizeDistribution {
  entries: PrizeDistributionEntry[];
  nonWinningProbability: number;
}

export interface PrizeOutcome {
  label: string;
  amount: number;
}
