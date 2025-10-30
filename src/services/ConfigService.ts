import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';

import { z } from 'zod';
import { parse as parseYaml } from 'yaml';

import {
  EncounterEvent,
  EncounterOption,
  EncounterOptionEffect,
  GameConfig,
  GameSettings,
  PrizeDistribution,
  PrizeTier,
  TicketType,
} from '../domain/types.js';
import { GameError } from '../domain/errors.js';
import { buildPrizeDistribution } from '../utils/prizeEngine.js';

const prizeTierSchema: z.ZodType<PrizeTier> = z.object({
  label: z.string(),
  amount: z.number().nonnegative(),
  share: z.number().min(0).max(1).optional(),
  weight: z.number().min(0).optional(),
  count: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

const encounterOptionEffectSchema: z.ZodType<EncounterOptionEffect> = z.object({
  priceMultiplier: z.number().nonnegative().optional(),
  priceOffset: z.number().optional(),
  rtpMultiplier: z.number().positive().optional(),
  bonusProbability: z.number().min(0).max(1).optional(),
  freeTickets: z.number().int().nonnegative().optional(),
  nextTicketTypeOverride: z.string().optional(),
  modifierDuration: z.number().int().nonnegative().optional(),
  balanceBonus: z.number().optional(),
  balancePenalty: z.number().optional(),
  cooldownPurchases: z.number().int().nonnegative().optional(),
  metadata: z.record(z.any()).optional(),
});

const encounterOptionSchema: z.ZodType<EncounterOption> = z.object({
  id: z.string(),
  label: z.string(),
  effect: encounterOptionEffectSchema,
  riskDescription: z.string().optional(),
  cooldown: z.number().int().nonnegative().optional(),
  telemetryTags: z.array(z.string()).optional(),
});

const encounterEventSchema: z.ZodType<EncounterEvent> = z.object({
  id: z.string(),
  name: z.string(),
  triggerChance: z.number().min(0).max(1),
  maxPerSession: z.number().int().positive().optional(),
  category: z.string().optional(),
  narrative: z.record(z.string()).optional(),
  options: z.array(encounterOptionSchema).min(1),
  metadata: z.record(z.any()).optional(),
});

const ticketTypeSchema: z.ZodType<TicketType> = z.object({
  id: z.string(),
  name: z.record(z.string()),
  faceValue: z.number().nonnegative(),
  rtpTarget: z.number().min(0).max(1),
  maxPrize: z.number().nonnegative(),
  ticketLimit: z.number().int().nonnegative().optional(),
  prizeTiers: z.array(prizeTierSchema).min(1),
  mediaRefs: z.record(z.string()).optional(),
  description: z.string().optional(),
  localeOverrides: z.record(z.any()).optional(),
});

const gameSettingsSchema: z.ZodType<GameSettings> = z.object({
  initialBalance: z.number().nonnegative(),
  targetBalance: z.number().nonnegative(),
  minPurchaseIntervalMs: z.number().int().nonnegative().optional(),
  maxSessionsPerDay: z.number().int().nonnegative().optional(),
  leaderboardSize: z.number().int().nonnegative().optional(),
  locale: z.string().optional(),
  analytics: z
    .object({
      provider: z.string().optional(),
      stream: z.string().optional(),
      customDimensions: z.array(z.string()).optional(),
    })
    .optional(),
  antiCheat: z
    .object({
      purchaseVelocityThreshold: z.number().int().nonnegative().optional(),
      winRateStdDevLimit: z.number().nonnegative().optional(),
      scratchCoverageThreshold: z.number().min(0).max(1).optional(),
      flaggingActions: z.array(z.string()).optional(),
    })
    .optional(),
});

const gameConfigSchema: z.ZodType<GameConfig> = z.object({
  ticketTypes: z.array(ticketTypeSchema).min(1),
  encounterEvents: z.array(encounterEventSchema).optional(),
  game: gameSettingsSchema,
});

const DEFAULT_CONFIG_PATH = resolve(process.cwd(), 'config/default-config.yaml');

export class ConfigService {
  private config: GameConfig | null = null;

  private ticketIndex = new Map<string, TicketType>();

  private encounterEvents: EncounterEvent[] = [];

  private prizeDistributions = new Map<string, PrizeDistribution>();

  async load(configPath?: string): Promise<void> {
    const candidatePath = configPath ?? process.env.CONFIG_PATH ?? DEFAULT_CONFIG_PATH;
    const resolvedPath = resolve(candidatePath);
    const contents = readFileSync(resolvedPath, 'utf-8');
    const parsed = this.parseConfigContents(contents, extname(resolvedPath));
    const config = gameConfigSchema.parse(parsed);

    this.config = config;
    this.ticketIndex = new Map(config.ticketTypes.map((ticket) => [ticket.id, ticket]));
    this.encounterEvents = [...(config.encounterEvents ?? [])];
    this.prizeDistributions = new Map(
      config.ticketTypes.map((ticket) => [ticket.id, buildPrizeDistribution(ticket)]),
    );
  }

  getConfig(): GameConfig {
    if (!this.config) {
      throw new GameError('CONFIG_NOT_INITIALISED', 'Configuration has not been loaded yet');
    }
    return this.config;
  }

  listTicketTypes(): TicketType[] {
    return Array.from(this.ticketIndex.values()).map((ticket) => ({ ...ticket }));
  }

  requireTicketType(id: string): TicketType {
    const ticket = this.ticketIndex.get(id);
    if (!ticket) {
      throw new GameError('TICKET_TYPE_NOT_FOUND', `Ticket type "${id}" not found`, 404, {
        ticketTypeId: id,
      });
    }
    return ticket;
  }

  getEncounterEvents(): EncounterEvent[] {
    return this.encounterEvents.map((event) => ({
      ...event,
      options: event.options.map((option) => ({ ...option })),
    }));
  }

  getPrizeDistribution(ticketTypeId: string): PrizeDistribution {
    const distribution = this.prizeDistributions.get(ticketTypeId);
    if (!distribution) {
      throw new GameError('PRIZE_DISTRIBUTION_NOT_FOUND', 'Prize distribution missing for ticket type', 500, {
        ticketTypeId,
      });
    }
    return {
      nonWinningProbability: distribution.nonWinningProbability,
      entries: distribution.entries.map((entry) => ({ ...entry })),
    } satisfies PrizeDistribution;
  }

  private parseConfigContents(contents: string, extension: string): unknown {
    if (extension.toLowerCase() === '.json') {
      return JSON.parse(contents);
    }
    return parseYaml(contents);
  }
}
