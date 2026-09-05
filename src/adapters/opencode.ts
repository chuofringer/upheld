import { Claim } from '../types.js';
import { normalizeToolEventsToClaims, RawToolEvent } from './shared.js';

export interface OpenCodeSessionEvent {
  event?: string;
  type?: string;
  toolName?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export function normalizeOpenCodeSessionToClaims(events: OpenCodeSessionEvent[]): Claim[] {
  const rawEvents: RawToolEvent[] = events
    .filter((e) => e.event === 'tool_executed' || e.type === 'tool_result' || e.toolName || e.tool)
    .map((e) => ({
      tool: e.toolName || e.tool,
      input: e.input,
      output: e.output,
    }));

  return normalizeToolEventsToClaims(rawEvents);
}
