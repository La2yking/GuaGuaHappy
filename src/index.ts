import fastify from 'fastify';
import { ZodError } from 'zod';

import { registerRoutes } from './api/routes.js';
import { isGameError } from './domain/errors.js';
import { ConfigService } from './services/ConfigService.js';
import { EncounterService } from './services/EncounterService.js';
import { SessionService } from './services/SessionService.js';
import { TicketService } from './services/TicketService.js';

async function bootstrap(): Promise<void> {
  const configService = new ConfigService();
  await configService.load();

  const sessionService = new SessionService(configService);
  const encounterService = new EncounterService(configService, sessionService);
  const ticketService = new TicketService(
    configService,
    sessionService,
    encounterService,
  );

  const app = fastify({
    logger: true,
  });

  registerRoutes(app, {
    configService,
    sessionService,
    ticketService,
  });

  app.setErrorHandler((error, request, reply) => {
    if (isGameError(error)) {
      reply.status(error.statusCode ?? 400).send({
        error: error.name,
        code: error.code,
        message: error.message,
        details: error.details,
      });
      return;
    }

    if (error instanceof ZodError) {
      reply.status(400).send({
        error: 'ValidationError',
        message: 'Request validation failed',
        issues: error.issues,
      });
      return;
    }

    request.log.error(error, 'Unhandled application error');
    reply.status(500).send({
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    });
  });

  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const host = process.env.HOST ?? '0.0.0.0';

  await app.listen({ port, host });
  app.log.info(`Scratch lottery service listening on http://${host}:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start scratch lottery service', error);
  process.exitCode = 1;
});
