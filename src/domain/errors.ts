export class GameError extends Error {
  public readonly statusCode: number;

  public readonly code: string;

  public readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'GameError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const isGameError = (error: unknown): error is GameError =>
  error instanceof GameError;
