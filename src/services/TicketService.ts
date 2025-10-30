import { createHash, randomUUID } from 'node:crypto';

import { GameError } from '../domain/errors.js';
import {
  EncounterResolution,
  GameSession,
  PendingEncounterContext,
  PrizeOutcome,
  TicketInstance,
  TicketType,
} from '../domain/types.js';
import { roundCurrency } from '../utils/currency.js';
import { rollPrize } from '../utils/prizeEngine.js';
import { ConfigService } from './ConfigService.js';
import { EncounterService } from './EncounterService.js';
import { SessionService } from './SessionService.js';

export interface PurchaseOptions {
  encounterOptionId?: string;
}

export type PurchaseResult =
  | {
      status: 'encounter_required';
      session: GameSession;
      encounter: PendingEncounterContext;
    }
  | {
      status: 'completed';
      session: GameSession;
      ticket: TicketInstance;
      pricePaid: number;
      prize: PrizeOutcome | null;
      encounterResolution?: EncounterResolution;
      freeTicketUsed: boolean;
    }
  | {
      status: 'session_closed';
      session: GameSession;
      reason: 'session_state_changed';
      encounterResolution?: EncounterResolution;
    };

export class TicketService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
    private readonly encounterService: EncounterService,
  ) {}

  handlePurchase(
    sessionId: string,
    ticketTypeId: string,
    options: PurchaseOptions = {},
  ): PurchaseResult {
    const session = this.sessionService.requireSession(sessionId);
    this.sessionService.ensureActive(session);
    this.sessionService.ensurePurchaseInterval(session);

    let encounterResolution: EncounterResolution | undefined;

    if (session.pendingEncounter) {
      if (!options.encounterOptionId) {
        return {
          status: 'encounter_required',
          session,
          encounter: session.pendingEncounter,
        };
      }
      encounterResolution = this.encounterService.resolveEncounterOption(
        session,
        options.encounterOptionId,
      );
      if (session.state !== 'active') {
        return {
          status: 'session_closed',
          session,
          reason: 'session_state_changed',
          encounterResolution,
        };
      }
    } else {
      const pending = this.encounterService.maybeTriggerEncounter(session);
      if (pending) {
        return {
          status: 'encounter_required',
          session,
          encounter: pending,
        };
      }
    }

    const ticketType = this.configService.requireTicketType(ticketTypeId);
    const previewModifiers = this.sessionService.previewActiveModifiers(session);

    let price = roundCurrency(
      ticketType.faceValue * previewModifiers.priceMultiplier + previewModifiers.priceOffset,
    );
    if (price < 0) {
      price = 0;
    }

    let freeTicketUsed = false;
    if (session.freeTicketsRemaining > 0) {
      price = 0;
      freeTicketUsed = true;
      this.sessionService.decrementFreeTicket(session);
    }

    if (price > session.balance) {
      throw new GameError('INSUFFICIENT_FUNDS', 'Insufficient balance to purchase ticket', 400, {
        balance: session.balance,
        ticketTypeId: ticketType.id,
        price,
      });
    }

    const modifiers = this.sessionService.consumeActiveModifiers(session);
    if (!freeTicketUsed) {
      price = roundCurrency(
        ticketType.faceValue * modifiers.priceMultiplier + modifiers.priceOffset,
      );
      if (price < 0) {
        price = 0;
      }
    }

    const ticket = this.generateTicketInstance(ticketType);

    if (price > 0) {
      this.sessionService.applyBalanceDelta({
        session,
        delta: -price,
        type: 'purchase',
        ticketId: ticket.id,
        metadata: {
          ticketTypeId: ticketType.id,
          priceMultiplier: modifiers.priceMultiplier,
          priceOffset: modifiers.priceOffset,
          freeTicketUsed,
        },
      });
    } else {
      this.sessionService.recordNonMonetaryTransaction(session, 'free_ticket', {
        ticketTypeId: ticketType.id,
        ticketId: ticket.id,
      });
    }

    const distribution = this.configService.getPrizeDistribution(ticketType.id);
    const prize = rollPrize(distribution, {
      rtpMultiplier: modifiers.rtpMultiplier,
    });

    let normalizedPrize: PrizeOutcome | null = null;

    if (prize && prize.amount > 0) {
      const awardedAmount = roundCurrency(prize.amount);
      ticket.prizeAwarded = awardedAmount;
      ticket.prizeTierLabel = prize.label;
      normalizedPrize = {
        label: prize.label,
        amount: awardedAmount,
      } satisfies PrizeOutcome;
      this.sessionService.applyBalanceDelta({
        session,
        delta: awardedAmount,
        type: 'win',
        ticketId: ticket.id,
        metadata: {
          ticketTypeId: ticketType.id,
          prizeLabel: prize.label,
        },
      });
    } else {
      ticket.prizeAwarded = 0;
      normalizedPrize = null;
    }

    this.sessionService.recordTicket(session, ticket);
    this.sessionService.incrementScratchCount(session);
    session.lastPurchaseAt = Date.now();
    this.sessionService.updateStateFromBalance(session);
    this.sessionService.tickEncounterCooldowns(session);

    return {
      status: 'completed',
      session,
      ticket,
      pricePaid: price,
      prize: normalizedPrize,
      encounterResolution,
      freeTicketUsed,
    };
  }

  private generateTicketInstance(ticketType: TicketType): TicketInstance {
    const seed = randomUUID();
    const createdAt = new Date().toISOString();
    const signaturePayload = `${ticketType.id}:${seed}:${createdAt}`;
    const signature = createHash('sha256')
      .update(signaturePayload)
      .digest('hex');
    const ticketCode = `${ticketType.id}-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

    return {
      id: randomUUID(),
      ticketTypeId: ticketType.id,
      code: ticketCode,
      seed,
      signature,
      createdAt,
    };
  }
}
