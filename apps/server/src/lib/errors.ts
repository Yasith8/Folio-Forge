import { formatZodIssues, type ApiErrorBody, type ValidationIssue } from '@folioforge/shared';
import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, code = 'bad_request') =>
  new HttpError(400, code, message);
export const unauthorized = (message = 'Sign in to continue.') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message: string) => new HttpError(403, 'forbidden', message);
export const notFound = (message = 'Not found.') => new HttpError(404, 'not_found', message);
export const conflict = (message: string, code = 'conflict') => new HttpError(409, code, message);

function body(code: string, message: string, details?: ValidationIssue[]): ApiErrorBody {
  return { error: { code, message, ...(details ? { details } : {}) } };
}

interface BodyParserError extends Error {
  type?: string;
  status?: number;
}

export const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof ZodError) {
    res
      .status(400)
      .json(body('validation_error', 'Some fields need attention.', formatZodIssues(err)));
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json(body(err.code, err.message, err.details));
    return;
  }
  const parserError = err as BodyParserError;
  if (parserError?.type === 'entity.too.large') {
    res
      .status(413)
      .json(body('payload_too_large', 'The request is too large. Use a smaller photo.'));
    return;
  }
  if (parserError?.type === 'entity.parse.failed') {
    res.status(400).json(body('invalid_json', 'The request body is not valid JSON.'));
    return;
  }
  console.error(err);
  res.status(500).json(body('internal_error', 'Something went wrong on the server. Try again.'));
};
