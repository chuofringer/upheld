#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import from local build if available, otherwise relative path
let normalizeCodexSessionToClaims;
try {
  const mod = await import('../../dist/index.js');
  normalizeCodexSessionToClaims = mod.normalizeCodexSessionToClaims;
} catch {
  const mod = await import('../../src/index.js');
  normalizeCodexSessionToClaims = mod.normalizeCodexSessionToClaims;
}

const sessionLogPath = process.argv[2] || process.env.CODEX_SESSION_LOG || '.codex/session.json';
const claimsOutputPath = process.argv[3] || '.codex/claims.json';

const fullLogPath = resolve(process.cwd(), sessionLogPath);
if (!existsSync(fullLogPath)) {
  console.log(`[upheld-codex-hook] No Codex session file found at ${sessionLogPath}, skipping claims generation.`);
  process.exit(0);
}

try {
  const content = readFileSync(fullLogPath, 'utf-8');
  const events = JSON.parse(content);
  const eventList = Array.isArray(events) ? events : events.events || [];
  const claims = normalizeCodexSessionToClaims(eventList);

  const claimsDoc = {
    version: '1.0',
    claims,
  };

  const fullOutputPath = resolve(process.cwd(), claimsOutputPath);
  writeFileSync(fullOutputPath, JSON.stringify(claimsDoc, null, 2), 'utf-8');
  console.log(`[upheld-codex-hook] Emitted ${claims.length} claims to ${claimsOutputPath}`);
} catch (err) {
  console.error(`[upheld-codex-hook] Error generating claims:`, err);
  process.exit(1);
}
