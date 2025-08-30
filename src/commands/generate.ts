import type { Command } from 'commander'
import ora from 'ora'
import type { GenerateOptions } from '../types.js'
import { FileDiscovery } from '../core/file-discovery.js'
import { CommandGenerator } from '../core/command-generator.js'
import { PathUtils } from '../utils/paths.js'
import { Logger } from '../utils/logger.js'

export function addGenerateCommand(program: Command) {
  program
    .command('generate')
    .alias('gen')
    .description('Generate slash commands from Claude Code agents')
    .option('-s, --scope <scope>', 'Target scope: project, user, or both', 'project')
    .option('-d, --dry-run', 'Preview changes without writing files', false)
    .option('-f, --force', 'Overwrite existing files', false)
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options: GenerateOptions) => {
      Logger.setVerbose(options.verbose)

      try {
        await generateCommands(options)
      } catch (error) {
        Logger.error(`Generation failed: ${error}`)
        process.exit(1)
      }
    })
}

async function generateCommands(options: GenerateOptions) {
  const spinner = ora('Discovering agents...').start()

  try {
    // Validate scope
    if (!['project', 'user', 'both'].includes(options.scope)) {
      throw new Error('Scope must be one of: project, user, both')
    }

    // Check if we have valid directories
    const agentsDirs = PathUtils.getValidAgentsDirs(options.scope)
    if (agentsDirs.length === 0) {
      spinner.fail('No agent directories found')

      if (options.scope === 'project' || options.scope === 'both') {
        Logger.info('To create project agents, run: mkdir -p .claude/agents')
      }

      if (options.scope === 'user' || options.scope === 'both') {
        Logger.info(`To create user agents, run: mkdir -p ${PathUtils.getUserAgentsDir()}`)
      }

      return
    }

    spinner.text = 'Discovering agents...'
    const agents = await FileDiscovery.discoverAgents(options.scope)

    if (agents.length === 0) {
      spinner.fail('No agents found')
      Logger.info('Make sure you have .md files with proper frontmatter in your agents directories')
      return
    }

    spinner.succeed(`Found ${agents.length} agent${agents.length === 1 ? '' : 's'}`)

    // Show what we found
    Logger.header('\n📋 Discovered Agents:')
    for (const agent of agents) {
      Logger.log(`  • ${agent.frontmatter.name} (${agent.scope})`)
      Logger.dim(`    ${agent.relativePath}`)
      Logger.dim(`    ${agent.frontmatter.description.substring(0, 80)}...`)
    }

    // Resolve naming conflicts
    const nameMap = CommandGenerator.resolveNamingConflicts(agents)

    // Check for conflicts
    const conflicts: string[] = []
    for (const [agentName, commandName] of nameMap.entries()) {
      if (agentName !== CommandGenerator.generateCommandName(agentName)) {
        conflicts.push(`${agentName} -> /${commandName}`)
      }
    }

    if (conflicts.length > 0) {
      Logger.warning('\n⚠️  Naming conflicts resolved:')
      for (const conflict of conflicts) {
        Logger.dim(`    ${conflict}`)
      }
    }

    if (options.dryRun) {
      Logger.header('\n🎯 Preview (--dry-run):')
      for (const agent of agents) {
        const commandName = nameMap.get(agent.frontmatter.name) || 'unknown'
        Logger.info(`Would generate: /${commandName}`)
        Logger.dim(`  Source: ${agent.relativePath} (${agent.scope})`)
        Logger.dim(`  Target: .claude/commands/${commandName}.md`)
      }
      Logger.log('\nRun without --dry-run to generate files.')
      return
    }

    // Generate commands
    const generatingSpinner = ora('Generating commands...').start()
    const generated: string[] = []
    const skipped: string[] = []
    const errors: string[] = []

    for (const agent of agents) {
      try {
        const targetScope = options.scope === 'both' ? 'project' : (options.scope as 'project' | 'user')
        const result = await CommandGenerator.generateCommand(agent, targetScope, options.force)
        generated.push(result.commandName)

        generatingSpinner.text = `Generated /${result.commandName}`
      } catch (error) {
        const commandName = nameMap.get(agent.frontmatter.name) || agent.frontmatter.name

        if (error instanceof Error && error.message.includes('already exists')) {
          skipped.push(commandName)
        } else {
          errors.push(`${commandName}: ${error}`)
        }
      }
    }

    generatingSpinner.succeed('Command generation complete')

    // Report results
    Logger.header('\n✅ Generation Summary:')

    if (generated.length > 0) {
      Logger.success(`Generated ${generated.length} command${generated.length === 1 ? '' : 's'}:`)
      for (const name of generated) {
        Logger.log(`  • /${name}`)
      }
    }

    if (skipped.length > 0) {
      Logger.warning(`\nSkipped ${skipped.length} existing command${skipped.length === 1 ? '' : 's'}:`)
      for (const name of skipped) {
        Logger.log(`  • /${name} (use --force to overwrite)`)
      }
    }

    if (errors.length > 0) {
      Logger.error(`\nErrors (${errors.length}):`)
      for (const error of errors) {
        Logger.log(`  • ${error}`)
      }
    }

    // Next steps
    if (generated.length > 0) {
      Logger.header('\n🚀 Next Steps:')
      Logger.info('Your new slash commands are ready to use in Claude Code!')
      Logger.dim('Type / in Claude Code to see all available commands.')
      Logger.dim('Run `ccsa list` to see all generated commands.')
      Logger.dim('Run `ccsa sync` to update commands when agents change.')
    }
  } catch (error) {
    spinner.fail('Generation failed')
    throw error
  }
}
