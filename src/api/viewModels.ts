import {
  ActiveModifier,
  EncounterHistoryEntry,
  EncounterOption,
  EncounterResolution,
  GameSession,
  PendingEncounterContext,
  TicketInstance,
  Transaction,
} from '../domain/types.js';

export interface TicketView {
  id: string;
  ticketTypeId: string;
  code: string;
  createdAt: string;
  prizeAwarded: number;
  prizeTierLabel?: string;
}

export interface TransactionView {
  id: string;
  type: Transaction['type'];
  delta: number;
  balanceAfter: number;
  timestamp: string;
  ticketId?: string;
  metadata?: Record<string, unknown>;
}

export interface EncounterHistoryView {
  eventId: string;
  optionId?: string;
  triggeredAt: string;
  resolvedAt?: string;
  outcome?: string;
  metadata?: Record<string, unknown>;
}

export interface EncounterOptionView {
  id: string;
  label: string;
  riskDescription?: string;
  cooldown?: number;
  telemetryTags?: string[];
}

export interface EncounterEffectSummary {
  priceMultiplier?: number;
  priceOffset?: number;
  rtpMultiplier?: number;
  balanceBonus?: number;
  balancePenalty?: number;
  freeTickets?: number;
  modifierDuration?: number;
}

export interface EncounterModifierView {
  id: string;
  appliedAt: string;
  remainingPurchases: number;
  effect: EncounterEffectSummary;
}

export interface EncounterSummaryView {
  id: string;
  name: string;
  category?: string;
  triggerChance: number;
  narrative?: Record<string, string>;
  options: EncounterOptionView[];
  triggeredAt: string;
}

export interface EncounterResolutionView {
  eventId: string;
  option: EncounterOptionView & { effect?: EncounterEffectSummary };
  transactions: TransactionView[];
  modifiersApplied: EncounterModifierView[];
  freeTicketsGranted: number;
}

export interface SessionView {
  id: string;
  playerId?: string;
  state: GameSession['state'];
  balance: number;
  initialBalance: number;
  targetBalance: number;
  maxBalance: number;
  scratchCount: number;
  encounterCount: number;
  freeTicketsRemaining: number;
  startedAt: string;
  finishedAt?: string;
  transactions: TransactionView[];
  tickets: TicketView[];
  encounterHistory: EncounterHistoryView[];
  pendingEncounter?: EncounterSummaryView;
}

const mapEncounterOptionToView = (option: EncounterOption): EncounterOptionView => ({
  id: option.id,
  label: option.label,
  riskDescription: option.riskDescription,
  cooldown: option.cooldown,
  telemetryTags: option.telemetryTags,
});

const summariseEffect = (option: EncounterOption): EncounterEffectSummary | undefined => {
  const effect = option.effect;
  if (!effect) {
    return undefined;
  }
  const summary: EncounterEffectSummary = {};
  if (effect.priceMultiplier !== undefined) {
    summary.priceMultiplier = effect.priceMultiplier;
  }
  if (effect.priceOffset !== undefined) {
    summary.priceOffset = effect.priceOffset;
  }
  if (effect.rtpMultiplier !== undefined) {
    summary.rtpMultiplier = effect.rtpMultiplier;
  }
  if (effect.balanceBonus !== undefined) {
    summary.balanceBonus = effect.balanceBonus;
  }
  if (effect.balancePenalty !== undefined) {
    summary.balancePenalty = effect.balancePenalty;
  }
  if (effect.freeTickets !== undefined) {
    summary.freeTickets = effect.freeTickets;
  }
  if (effect.modifierDuration !== undefined) {
    summary.modifierDuration = effect.modifierDuration;
  }
  return Object.keys(summary).length ? summary : undefined;
};

const mapModifierToView = (modifier: ActiveModifier): EncounterModifierView => ({
  id: modifier.id,
  appliedAt: modifier.appliedAt,
  remainingPurchases: modifier.remainingPurchases,
  effect: {
    priceMultiplier: modifier.effect.priceMultiplier,
    priceOffset: modifier.effect.priceOffset,
    rtpMultiplier: modifier.effect.rtpMultiplier,
  },
});

export const mapTransactionToView = (
  transaction: Transaction,
): TransactionView => ({
  id: transaction.id,
  type: transaction.type,
  delta: transaction.delta,
  balanceAfter: transaction.balanceAfter,
  timestamp: transaction.timestamp,
  ticketId: transaction.ticketId,
  metadata: transaction.metadata,
});

const mapEncounterHistoryEntryToView = (
  entry: EncounterHistoryEntry,
): EncounterHistoryView => ({
  eventId: entry.eventId,
  optionId: entry.optionId,
  triggeredAt: entry.triggeredAt,
  resolvedAt: entry.resolvedAt,
  outcome: entry.outcome,
  metadata: entry.metadata,
});

export const mapEncounterContextToView = (
  context: PendingEncounterContext,
): EncounterSummaryView => ({
  id: context.event.id,
  name: context.event.name,
  category: context.event.category,
  triggerChance: context.event.triggerChance,
  narrative: context.event.narrative,
  options: context.event.options.map(mapEncounterOptionToView),
  triggeredAt: context.triggeredAt,
});

export const mapEncounterResolutionToView = (
  resolution: EncounterResolution,
): EncounterResolutionView => ({
  eventId: resolution.eventId,
  option: {
    ...mapEncounterOptionToView(resolution.option),
    effect: summariseEffect(resolution.option),
  },
  transactions: resolution.transactions.map(mapTransactionToView),
  modifiersApplied: resolution.modifiersApplied.map(mapModifierToView),
  freeTicketsGranted: resolution.freeTicketsGranted,
});

export const mapTicketToView = (ticket: TicketInstance): TicketView => ({
  id: ticket.id,
  ticketTypeId: ticket.ticketTypeId,
  code: ticket.code,
  createdAt: ticket.createdAt,
  prizeAwarded: ticket.prizeAwarded ?? 0,
  prizeTierLabel: ticket.prizeTierLabel,
});



export const mapSessionToView = (session: GameSession): SessionView => ({
  id: session.id,
  playerId: session.playerId,
  state: session.state,
  balance: session.balance,
  initialBalance: session.initialBalance,
  targetBalance: session.targetBalance,
  maxBalance: session.maxBalance,
  scratchCount: session.scratchCount,
  encounterCount: session.encounterCount,
  freeTicketsRemaining: session.freeTicketsRemaining,
  startedAt: session.startedAt,
  finishedAt: session.finishedAt,
  transactions: session.transactions.map(mapTransactionToView),
  tickets: session.tickets.map(mapTicketToView),
  encounterHistory: session.encounterTracker.history.map(
    mapEncounterHistoryEntryToView,
  ),
  pendingEncounter: session.pendingEncounter
    ? mapEncounterContextToView(session.pendingEncounter)
    : undefined,
});
