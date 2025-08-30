#!/usr/bin/env node

// This is the executable entry point for cc-slash-agents (ccsa)
// It imports and runs the compiled TypeScript CLI

import('../dist/cli.js').catch((error) => {
  console.error('Failed to start cc-slash-agents:', error.message)
  process.exit(1)
})
