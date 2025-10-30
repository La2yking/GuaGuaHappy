import { randomUUID } from 'node:crypto';

import { GameError } from '../domain/errors.js';
import {
  ActiveModifier,
  AggregatedPurchaseModifiers,
  EncounterHistoryEntry,
  GameSession,
  PendingEncounterContext,
  PurchaseModifierEffect,
  TicketInstance,
  Transaction,
  TransactionType,
} from '../domain/types.js';
import { roundCurrency } from '../utils/currency.js';
import { ConfigService } from './ConfigService.js';

interface SessionCreationOptions {
  playerId?: string;
}

interface TransactionPayload {
  session: GameSession;
  delta: number;
  type: TransactionType;
  ticketId?: string;
  metadata?: Record<string, unknown>;
}

export class SessionService {
  private readonly sessions = new Map<string, GameSession>();

  constructor(private readonly configService: ConfigService) {}

  createSession(options: SessionCreationOptions = {}): GameSession {
    const config = this.configService.getConfig();
    const initialBalance = roundCurrency(config.game.initialBalance);
    const targetBalance = roundCurrency(config.game.targetBalance);
    const now = new Date().toISOString();

    const session: GameSession = {
      id: randomUUID(),
      playerId: options.playerId,
      initialBalance,
      targetBalance,
      balance: initialBalance,
      maxBalance: initialBalance,
      scratchCount: 0,
      encounterCount: 0,
      state: 'active',
      startedAt: now,
      transactions: [],
      tickets: [],
      activeModifiers: [],
      freeTicketsRemaining: 0,
      encounterTracker: {
        counts: {},
        optionCooldowns: {},
        history: [],
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  getSession(id: string): GameSession | undefined {
    return this.sessions.get(id);
  }

  requireSession(id: string): GameSession {
    const session = this.getSession(id);
    if (!session) {
      throw new GameError('SESSION_NOT_FOUND', `Session "${id}" was not found`, 404, {
        sessionId: id,
      });
    }
    return session;
  }

  ensureActive(session: GameSession): void {
    if (session.state !== 'active') {
      throw new GameError(
        'SESSION_NOT_ACTIVE',
        `Session ${session.id} is not active (state: ${session.state})`,
        409,
        { state: session.state },
      );
    }
  }

  ensurePurchaseInterval(session: GameSession, now = Date.now()): void {
    const interval = this.configService.getConfig().game.minPurchaseIntervalMs;
    if (!interval) {
      return;
    }
    if (session.lastPurchaseAt && now - session.lastPurchaseAt < interval) {
      const retryIn = interval - (now - session.lastPurchaseAt);
      throw new GameError('PURCHASE_RATE_LIMIT', 'Purchase attempts are throttled', 429, {
        retryInMs: retryIn,
      });
    }
  }

  applyBalanceDelta(payload: TransactionPayload): Transaction {
    const { session, delta, type, ticketId, metadata } = payload;
    const roundedDelta = roundCurrency(delta);
    let appliedDelta = roundedDelta;
    const preBalance = session.balance;
    let newBalance = roundCurrency(session.balance + roundedDelta);

    if (newBalance < 0) {
      appliedDelta = -preBalance;
      newBalance = 0;
    }

    session.balance = newBalance;
    session.maxBalance = Math.max(session.maxBalance, session.balance);

    const transaction: Transaction = {
      id: randomUUID(),
      sessionId: session.id,
      ticketId,
      type,
      delta: roundCurrency(appliedDelta),
      balanceAfter: session.balance,
      timestamp: new Date().toISOString(),
      metadata,
    };

    session.transactions.push(transaction);
    return transaction;
  }

  recordNonMonetaryTransaction(
    session: GameSession,
    type: Exclude<TransactionType, 'purchase' | 'win' | 'encounter_bonus' | 'encounter_penalty'>,
    metadata?: Record<string, unknown>,
  ): Transaction {
    const transaction: Transaction = {
      id: randomUUID(),
      sessionId: session.id,
      type,
      delta: 0,
      balanceAfter: session.balance,
      timestamp: new Date().toISOString(),
      metadata,
    };
    session.transactions.push(transaction);
    return transaction;
  }

  incrementScratchCount(session: GameSession): void {
    session.scratchCount += 1;
  }

  recordTicket(session: GameSession, ticket: TicketInstance): void {
    session.tickets.push(ticket);
  }

  updateStateFromBalance(session: GameSession): void {
    if (session.state !== 'active') {
      return;
    }
    if (session.balance >= session.targetBalance) {
      session.state = 'won';
      session.finishedAt = session.finishedAt ?? new Date().toISOString();
      return;
    }
    if (session.balance <= 0) {
      session.balance = 0;
      session.state = 'lost';
      session.finishedAt = session.finishedAt ?? new Date().toISOString();
    }
  }

  setPendingEncounter(session: GameSession, context: PendingEncounterContext): void {
    session.pendingEncounter = context;
  }

  clearPendingEncounter(session: GameSession): void {
    session.pendingEncounter = undefined;
  }

  addActiveModifier(
    session: GameSession,
    effect: PurchaseModifierEffect,
    duration: number,
  ): ActiveModifier | null {
    if (duration <= 0) {
      return null;
    }
    const sanitized: PurchaseModifierEffect = {};
    if (effect.priceMultiplier !== undefined) {
      sanitized.priceMultiplier = effect.priceMultiplier;
    }
    if (effect.priceOffset !== undefined) {
      sanitized.priceOffset = effect.priceOffset;
    }
    if (effect.rtpMultiplier !== undefined) {
      sanitized.rtpMultiplier = effect.rtpMultiplier;
    }
    if (Object.keys(sanitized).length === 0) {
      return null;
    }
    const modifier: ActiveModifier = {
      id: randomUUID(),
      effect: sanitized,
      remainingPurchases: duration,
      appliedAt: new Date().toISOString(),
    };
    session.activeModifiers.push(modifier);
    return modifier;
  }

  previewActiveModifiers(session: GameSession): AggregatedPurchaseModifiers {
    if (!session.activeModifiers.length) {
      return {
        priceMultiplier: 1,
        priceOffset: 0,
        rtpMultiplier: 1,
      } satisfies AggregatedPurchaseModifiers;
    }

    let priceMultiplier = 1;
    let priceOffset = 0;
    let rtpMultiplier = 1;

    for (const modifier of session.activeModifiers) {
      const effect = modifier.effect;
      if (effect.priceMultiplier !== undefined) {
        priceMultiplier *= effect.priceMultiplier;
      }
      if (effect.priceOffset !== undefined) {
        priceOffset += effect.priceOffset;
      }
      if (effect.rtpMultiplier !== undefined) {
        rtpMultiplier *= effect.rtpMultiplier;
      }
    }

    if (priceMultiplier <= 0) {
      priceMultiplier = 1;
    }
    if (rtpMultiplier <= 0) {
      rtpMultiplier = 1;
    }

    return {
      priceMultiplier,
      priceOffset,
      rtpMultiplier,
    } satisfies AggregatedPurchaseModifiers;
  }

  consumeActiveModifiers(session: GameSession): AggregatedPurchaseModifiers {
    const aggregated = this.previewActiveModifiers(session);

    if (!session.activeModifiers.length) {
      return aggregated;
    }

    const remainingModifiers: ActiveModifier[] = [];

    for (const modifier of session.activeModifiers) {
      const remainingPurchases = modifier.remainingPurchases - 1;
      if (remainingPurchases > 0) {
        remainingModifiers.push({
          ...modifier,
          remainingPurchases,
        });
      }
    }

    session.activeModifiers = remainingModifiers;
    return aggregated;
  }

  grantFreeTickets(session: GameSession, count: number): void {
    if (count <= 0) {
      return;
    }
    session.freeTicketsRemaining += count;
  }

  decrementFreeTicket(session: GameSession): void {
    if (session.freeTicketsRemaining > 0) {
      session.freeTicketsRemaining -= 1;
    }
  }

  registerEncounterTrigger(session: GameSession, eventId: string): EncounterHistoryEntry {
    session.encounterCount += 1;
    session.encounterTracker.counts[eventId] =
      (session.encounterTracker.counts[eventId] ?? 0) + 1;
    const entry: EncounterHistoryEntry = {
      eventId,
      triggeredAt: new Date().toISOString(),
    };
    session.encounterTracker.history.push(entry);
    return entry;
  }

  resolveEncounterHistoryEntry(
    session: GameSession,
    eventId: string,
    optionId: string,
    outcome: EncounterHistoryEntry['outcome'] = 'selected',
  ): void {
    for (let index = session.encounterTracker.history.length - 1; index >= 0; index -= 1) {
      const entry = session.encounterTracker.history[index];
      if (entry.eventId === eventId && !entry.resolvedAt) {
        entry.optionId = optionId;
        entry.outcome = outcome;
        entry.resolvedAt = new Date().toISOString();
        return;
      }
    }
  }

  setOptionCooldown(session: GameSession, optionKey: string, cooldown: number): void {
    if (cooldown <= 0) {
      delete session.encounterTracker.optionCooldowns[optionKey];
      return;
    }
    session.encounterTracker.optionCooldowns[optionKey] = cooldown;
  }

  isOptionOnCooldown(session: GameSession, optionKey: string): boolean {
    const remaining = session.encounterTracker.optionCooldowns[optionKey];
    return typeof remaining === 'number' && remaining > 0;
  }

  tickEncounterCooldowns(session: GameSession): void {
    const entries = Object.entries(session.encounterTracker.optionCooldowns);
    for (const [key, value] of entries) {
      if (value <= 1) {
        delete session.encounterTracker.optionCooldowns[key];
        continue;
      }
      session.encounterTracker.optionCooldowns[key] = value - 1;
    }
  }

  terminateSession(session: GameSession, reason?: string): GameSession {
    session.state = 'terminated';
    session.finishedAt = session.finishedAt ?? new Date().toISOString();
    if (reason) {
      session.encounterTracker.history.push({
        eventId: 'session-terminated',
        outcome: 'expired',
        triggeredAt: new Date().toISOString(),
        resolvedAt: new Date().toISOString(),
        metadata: { reason },
      });
    }
    return session;
  }

  getAllSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }
}
