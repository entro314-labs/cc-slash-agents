#!/usr/bin/env node

import { Command } from 'commander'
import chalk from 'chalk'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { addGenerateCommand } from './commands/generate.js'
import { addListCommand } from './commands/list.js'
import { addSyncCommand } from './commands/sync.js'
import { addInteractiveCommand } from './commands/interactive.js'
import { Logger } from './utils/logger.js'

// Get package version
const __dirname = dirname(fileURLToPath(import.meta.url))
const packagePath = join(__dirname, '..', 'package.json')
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'))

const program = new Command()

program
  .name('cc-slash-agents')
  .version(packageJson.version)
  .description('Generate slash commands for Claude Code agents and create multi-agent workflows')
  .option('-v, --verbose', 'Enable verbose logging')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts()
    Logger.setVerbose(options.verbose)
  })

// Add subcommands
addGenerateCommand(program)
addListCommand(program)
addSyncCommand(program)
addInteractiveCommand(program)

// Add additional helpful commands
program
  .command('init')
  .description('Initialize Claude directory structure')
  .option('-g, --global', 'Initialize user-level structure', false)
  .action(async (options) => {
    try {
      const { initializeStructure } = await import('./commands/init.js')
      await initializeStructure(options)
    } catch (error) {
      Logger.error(`Initialization failed: ${error}`)
      process.exit(1)
    }
  })

program
  .command('clean')
  .description('Remove all generated commands')
  .option('-s, --scope <scope>', 'Scope to clean: project, user, or both', 'project')
  .option('-y, --yes', 'Skip confirmation', false)
  .action(async (options) => {
    try {
      const { cleanCommands } = await import('./commands/clean.js')
      await cleanCommands(options)
    } catch (error) {
      Logger.error(`Clean failed: ${error}`)
      process.exit(1)
    }
  })

// Custom help with branding
program.addHelpText('before', chalk.cyan.bold('🤖 cc-slash-agents (ccsa)'))
program.addHelpText('before', 'Generate slash commands for Claude Code agents\n')

program.addHelpText(
  'after',
  `
${chalk.bold('Examples:')}
  ${chalk.dim('# Generate commands from project agents')}
  ccsa generate

  ${chalk.dim('# List all agents and commands')}
  ccsa list

  ${chalk.dim('# Update commands when agents change')}
  ccsa sync

  ${chalk.dim('# Preview changes without writing')}
  ccsa generate --dry-run

  ${chalk.dim('# Work with user-level agents')}
  ccsa generate --scope user

${chalk.bold('Quick Start:')}
  1. Create agents in ${chalk.cyan('.claude/agents/')}
  2. Run ${chalk.cyan('ccsa generate')} to create slash commands
  3. Use ${chalk.cyan('/command-name')} in Claude Code

${chalk.bold('Learn more:')} ${chalk.cyan('https://github.com/yourusername/cc-slash-agents')}
`
)

// Handle unknown commands
program.on('command:*', (operands) => {
  Logger.error(`Unknown command: ${operands[0]}`)
  Logger.info('Use --help to see available commands')
  process.exit(1)
})

// Parse arguments
program.parse()

// Show help if no command provided
if (process.argv.length === 2) {
  program.help()
}
