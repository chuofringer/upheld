#!/usr/bin/env node
import { runCli } from './cli.js';

runCli().then((code) => {
  if (code !== 0) {
    process.exit(code);
  }
}).catch((err) => {
  console.error('Unexpected error running upheld:', err);
  process.exit(1);
});
