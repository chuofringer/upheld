export function parsePrompt(input: string): { action: string; target: string } {
  const parts = input.trim().split(/\s+/);
  return {
    action: parts[0] || 'noop',
    target: parts.slice(1).join(' ') || 'none',
  };
}

export function formatResult(action: string, target: string): string {
  return `[${action.toUpperCase()}]: ${target}`;
}
