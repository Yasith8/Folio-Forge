import { escapeHtml } from '@folioforge/shared';

/** Serializes JSON for an inline <script> without allowing "</script>" breakouts. */
export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export const attr = escapeHtml;
