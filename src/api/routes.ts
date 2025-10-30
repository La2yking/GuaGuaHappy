import { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { mapEncounterContextToView, mapEncounterResolutionToView, mapSessionToView, mapTicketToView } from './viewModels.js';
import { ConfigService } from '../services/ConfigService.js';
import { SessionService } from '../services/SessionService.js';
import { TicketService } from '../services/TicketService.js';

interface RouteDependencies {
  configService: ConfigService;
  sessionService: SessionService;
  ticketService: TicketService;
}

const createSessionBodySchema = z
  .object({
    playerId: z.string().min(1).max(128).optional(),
  })
  .strict();

const purchaseBodySchema = z
  .object({
    ticketTypeId: z.string().min(1),
    encounterOptionId: z.string().min(1).optional(),
  })
  .strict();

const sessionParamsSchema = z.object({ id: z.string().min(1) });

export const registerRoutes = (
  app: FastifyInstance,
  deps: RouteDependencies,
): void => {
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }));

  app.get('/config/tickets', async () => {
    const ticketTypes = deps.configService.listTicketTypes().map((ticket) => ({
      id: ticket.id,
      name: ticket.name,
      faceValue: ticket.faceValue,
      rtpTarget: ticket.rtpTarget,
      maxPrize: ticket.maxPrize,
      ticketLimit: ticket.ticketLimit,
      prizeTiers: ticket.prizeTiers,
      mediaRefs: ticket.mediaRefs,
      description: ticket.description,
      prizeDistribution: deps.configService.getPrizeDistribution(ticket.id),
    }));

    return { ticketTypes };
  });

  app.post('/sessions', async (request, reply) => {
    const body = createSessionBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      reply.code(400);
      return {
        error: 'InvalidRequest',
        message: 'Session payload is invalid',
        issues: body.error.issues,
      };
    }

    const session = deps.sessionService.createSession(body.data);
    reply.code(201);
    return {
      session: mapSessionToView(session),
    };
  });

  app.get('/sessions/:id', async (request) => {
    const params = sessionParamsSchema.parse(request.params);
    const session = deps.sessionService.requireSession(params.id);
    return {
      session: mapSessionToView(session),
    };
  });

  app.post('/sessions/:id/purchase', async (request, reply) => {
    const params = sessionParamsSchema.parse(request.params);
    const body = purchaseBodySchema.safeParse(request.body ?? {});
    if (!body.success) {
      reply.code(400);
      return {
        error: 'InvalidRequest',
        message: 'Purchase payload is invalid',
        issues: body.error.issues,
      };
    }

    const result = deps.ticketService.handlePurchase(params.id, body.data.ticketTypeId, {
      encounterOptionId: body.data.encounterOptionId,
    });

    if (result.status === 'encounter_required') {
      return {
        status: result.status,
        encounter: mapEncounterContextToView(result.encounter),
        session: mapSessionToView(result.session),
      };
    }

    if (result.status === 'session_closed') {
      reply.code(409);
      return {
        status: result.status,
        reason: result.reason,
        session: mapSessionToView(result.session),
        encounterResolution: result.encounterResolution
          ? mapEncounterResolutionToView(result.encounterResolution)
          : undefined,
      };
    }

    return {
      status: result.status,
      session: mapSessionToView(result.session),
      ticket: mapTicketToView(result.ticket),
      pricePaid: result.pricePaid,
      prize: result.prize,
      freeTicketUsed: result.freeTicketUsed,
      encounterResolution: result.encounterResolution
        ? mapEncounterResolutionToView(result.encounterResolution)
        : undefined,
    };
  });
};
