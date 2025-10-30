import { GameError } from '../domain/errors.js';
import {
  ActiveModifier,
  EncounterEvent,
  EncounterOption,
  EncounterOptionEffect,
  EncounterResolution,
  GameSession,
  PendingEncounterContext,
  Transaction,
} from '../domain/types.js';
import { ConfigService } from './ConfigService.js';
import { SessionService } from './SessionService.js';

const buildOptionKey = (eventId: string, optionId: string): string =>
  `${eventId}:${optionId}`;

export class EncounterService {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {}

  maybeTriggerEncounter(session: GameSession): PendingEncounterContext | null {
    const events = this.configService.getEncounterEvents();
    if (!events.length) {
      return null;
    }

    const availableEvents = events
      .map((event) => this.cloneEventWithAvailableOptions(session, event))
      .filter((event): event is EncounterEvent => event.options.length > 0);

    if (!availableEvents.length) {
      return null;
    }

    const shuffled = [...availableEvents].sort(() => Math.random() - 0.5);

    for (const event of shuffled) {
      const roll = Math.random();
      if (roll >= event.triggerChance) {
        continue;
      }

      const pending: PendingEncounterContext = {
        event,
        triggeredAt: new Date().toISOString(),
      };

      this.sessionService.setPendingEncounter(session, pending);
      const historyEntry = this.sessionService.registerEncounterTrigger(
        session,
        event.id,
      );
      historyEntry.metadata = {
        ...(historyEntry.metadata ?? {}),
        triggerChance: event.triggerChance,
        roll,
      };

      return pending;
    }

    return null;
  }

  resolveEncounterOption(
    session: GameSession,
    optionId: string,
  ): EncounterResolution {
    const pending = session.pendingEncounter;
    if (!pending) {
      throw new GameError('NO_PENDING_ENCOUNTER', 'There is no encounter to resolve', 409);
    }

    const option = pending.event.options.find((candidate) => candidate.id === optionId);
    if (!option) {
      throw new GameError('ENCOUNTER_OPTION_INVALID', 'Encounter option not recognised', 404, {
        optionId,
      });
    }

    const optionKey = buildOptionKey(pending.event.id, option.id);
    if (this.sessionService.isOptionOnCooldown(session, optionKey)) {
      throw new GameError('ENCOUNTER_OPTION_COOLDOWN', 'Encounter option is on cooldown', 409, {
        optionId,
        eventId: pending.event.id,
      });
    }

    const transactions: Transaction[] = [];
    const modifiers: ActiveModifier[] = [];
    let freeTicketsGranted = 0;
    const effect = option.effect ?? ({} as EncounterOptionEffect);

    if (effect.balanceBonus && effect.balanceBonus !== 0) {
      transactions.push(
        this.sessionService.applyBalanceDelta({
          session,
          delta: effect.balanceBonus,
          type: 'encounter_bonus',
          metadata: {
            eventId: pending.event.id,
            optionId: option.id,
          },
        }),
      );
    }

    if (effect.balancePenalty && effect.balancePenalty !== 0) {
      const penaltyDelta = -Math.abs(effect.balancePenalty);
      transactions.push(
        this.sessionService.applyBalanceDelta({
          session,
          delta: penaltyDelta,
          type: 'encounter_penalty',
          metadata: {
            eventId: pending.event.id,
            optionId: option.id,
          },
        }),
      );
    }

    if (effect.freeTickets && effect.freeTickets > 0) {
      this.sessionService.grantFreeTickets(session, effect.freeTickets);
      freeTicketsGranted = effect.freeTickets;
    }

    const duration = effect.modifierDuration ?? 1;
    const modifier = this.sessionService.addActiveModifier(session, effect, duration);
    if (modifier) {
      modifiers.push(modifier);
    }

    if (option.cooldown) {
      this.sessionService.setOptionCooldown(session, optionKey, option.cooldown);
    }

    this.sessionService.clearPendingEncounter(session);
    this.sessionService.resolveEncounterHistoryEntry(session, pending.event.id, option.id);
    this.sessionService.updateStateFromBalance(session);

    return {
      eventId: pending.event.id,
      option,
      transactions,
      modifiersApplied: modifiers,
      freeTicketsGranted,
    } satisfies EncounterResolution;
  }

  private cloneEventWithAvailableOptions(
    session: GameSession,
    event: EncounterEvent,
  ): EncounterEvent {
    const count = session.encounterTracker.counts[event.id] ?? 0;
    if (event.maxPerSession && count >= event.maxPerSession) {
      return {
        ...event,
        options: [],
      } satisfies EncounterEvent;
    }

    const options = event.options.filter((option) => {
      const optionKey = buildOptionKey(event.id, option.id);
      return !this.sessionService.isOptionOnCooldown(session, optionKey);
    });

    return {
      ...event,
      options: options.map((option) => ({ ...option })),
    } satisfies EncounterEvent;
  }
}
