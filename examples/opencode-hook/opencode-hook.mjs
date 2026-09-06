#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from local build if available, otherwise relative path
let normalizeOpenCodeSessionToClaims;
try {
  const mod = await import('../../dist/index.js');
  normalizeOpenCodeSessionToClaims = mod.normalizeOpenCodeSessionToClaims;
} catch {
  const mod = await import('../../src/index.js');
  normalizeOpenCodeSessionToClaims = mod.normalizeOpenCodeSessionToClaims;
}

const sessionLogPath = process.argv[2] || process.env.OPENCODE_SESSION_LOG || '.opencode/session.json';
const claimsOutputPath = process.argv[3] || '.opencode/claims.json';

const fullLogPath = resolve(process.cwd(), sessionLogPath);
if (!existsSync(fullLogPath)) {
  console.log(`[upheld-opencode-hook] No OpenCode session file found at ${sessionLogPath}, skipping claims generation.`);
  process.exit(0);
}

try {
  const content = readFileSync(fullLogPath, 'utf-8');
  const events = JSON.parse(content);
  const eventList = Array.isArray(events) ? events : events.events || [];
  const claims = normalizeOpenCodeSessionToClaims(eventList);

  const claimsDoc = {
    version: '1.0',
    claims,
  };

  const fullOutputPath = resolve(process.cwd(), claimsOutputPath);
  writeFileSync(fullOutputPath, JSON.stringify(claimsDoc, null, 2), 'utf-8');
  console.log(`[upheld-opencode-hook] Emitted ${claims.length} claims to ${claimsOutputPath}`);
} catch (err) {
  console.error(`[upheld-opencode-hook] Error generating claims:`, err);
  process.exit(1);
}
