#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizeCodexSessionToClaims } from 'upheld';

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
