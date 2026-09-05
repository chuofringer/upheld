import { Claim } from '../types.js';
import { normalizeToolEventsToClaims, RawToolEvent } from './shared.js';

export interface CodexSessionEvent {
  type: string;
  name?: string;
  parameters?: Record<string, unknown>;
  response?: Record<string, unknown>;
  role?: string;
  content?: unknown;
}

export function normalizeCodexSessionToClaims(events: CodexSessionEvent[]): Claim[] {
  const rawEvents: RawToolEvent[] = events
    .filter((e) => e.type === 'tool_call' || e.type === 'tool_use')
    .map((e) => ({
      name: e.name,
      parameters: e.parameters,
      response: e.response,
    }));

  return normalizeToolEventsToClaims(rawEvents);
}
