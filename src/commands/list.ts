import type { Command } from 'commander'
import { FileDiscovery } from '../core/file-discovery.js'
import { CommandGenerator } from '../core/command-generator.js'
import { Logger } from '../utils/logger.js'

export function addListCommand(program: Command) {
  program
    .command('list')
    .alias('ls')
    .description('List discovered agents and generated commands')
    .option('-s, --scope <scope>', 'Scope to list: project, user, or both', 'both')
    .option('-a, --agents-only', 'Show only agents', false)
    .option('-c, --commands-only', 'Show only commands', false)
    .option('-v, --verbose', 'Show detailed information', false)
    .action(async (options) => {
      Logger.setVerbose(options.verbose)

      try {
        await listAgentsAndCommands(options)
      } catch (error) {
        Logger.error(`List failed: ${error}`)
        process.exit(1)
      }
    })
}

async function listAgentsAndCommands(options: any) {
  const scope = options.scope

  if (!['project', 'user', 'both'].includes(scope)) {
    throw new Error('Scope must be one of: project, user, both')
  }

  const showAgents = !options.commandsOnly
  const showCommands = !options.agentsOnly

  // Discover agents
  let agents: any[] = []
  if (showAgents) {
    agents = await FileDiscovery.discoverAgents(scope)
  }

  // Discover existing commands
  let commands: any[] = []
  if (showCommands) {
    commands = await FileDiscovery.discoverCommands(scope)
  }

  // Show results
  if (showAgents && agents.length > 0) {
    Logger.header(`🤖 Agents (${agents.length})`)

    const projectAgents = agents.filter((a) => a.scope === 'project')
    const userAgents = agents.filter((a) => a.scope === 'user')

    if (projectAgents.length > 0) {
      Logger.info('\n📁 Project Agents:')
      for (const agent of projectAgents) {
        const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
        Logger.log(`  • ${agent.frontmatter.name} → /${commandName}`)

        if (options.verbose) {
          Logger.dim(`    Path: ${agent.relativePath}`)
          Logger.dim(`    Description: ${agent.frontmatter.description.substring(0, 100)}...`)
          if (agent.frontmatter.tools) {
            Logger.dim(`    Tools: ${agent.frontmatter.tools.join(', ')}`)
          }
        }
      }
    }

    if (userAgents.length > 0) {
      Logger.info('\n👤 User Agents:')
      for (const agent of userAgents) {
        const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
        Logger.log(`  • ${agent.frontmatter.name} → /${commandName}`)

        if (options.verbose) {
          Logger.dim(`    Path: ${agent.relativePath}`)
          Logger.dim(`    Description: ${agent.frontmatter.description.substring(0, 100)}...`)
          if (agent.frontmatter.tools) {
            Logger.dim(`    Tools: ${agent.frontmatter.tools.join(', ')}`)
          }
        }
      }
    }
  }

  if (showCommands && commands.length > 0) {
    Logger.header(`\n⚡ Commands (${commands.length})`)

    const projectCommands = commands.filter((c) => c.scope === 'project')
    const userCommands = commands.filter((c) => c.scope === 'user')

    const generatedCommands = commands.filter((c) => FileDiscovery.isGeneratedFile(c.path))
    const manualCommands = commands.filter((c) => !FileDiscovery.isGeneratedFile(c.path))

    if (generatedCommands.length > 0) {
      Logger.info('\n🤖 Generated Commands:')
      for (const command of generatedCommands) {
        const commandName = command.relativePath.replace('.md', '').replace(/\//g, ':')
        Logger.log(`  • /${commandName} (${command.scope})`)

        if (options.verbose) {
          Logger.dim(`    Path: ${command.relativePath}`)
          if (command.frontmatter.description) {
            Logger.dim(`    Description: ${command.frontmatter.description}`)
          }
        }
      }
    }

    if (manualCommands.length > 0) {
      Logger.info('\n✋ Manual Commands:')
      for (const command of manualCommands) {
        const commandName = command.relativePath.replace('.md', '').replace(/\//g, ':')
        Logger.log(`  • /${commandName} (${command.scope})`)

        if (options.verbose) {
          Logger.dim(`    Path: ${command.relativePath}`)
          if (command.frontmatter.description) {
            Logger.dim(`    Description: ${command.frontmatter.description}`)
          }
        }
      }
    }
  }

  // Show summary and suggestions
  if (agents.length === 0 && commands.length === 0) {
    Logger.warning('No agents or commands found.')
    Logger.info('Make sure you have .md files in .claude/agents/ or ~/.claude/agents/')
    Logger.info('Run `ccsa generate` to create commands from agents')
    return
  }

  Logger.header('\n📊 Summary:')
  if (showAgents) {
    Logger.log(`  Agents: ${agents.length}`)
  }
  if (showCommands) {
    const generated = commands.filter((c) => FileDiscovery.isGeneratedFile(c.path)).length
    const manual = commands.length - generated
    Logger.log(`  Commands: ${commands.length} (${generated} generated, ${manual} manual)`)
  }

  // Show suggestions
  if (showAgents && agents.length > 0) {
    const generatedCommandNames = commands
      .filter((c) => FileDiscovery.isGeneratedFile(c.path))
      .map((c) => c.relativePath.replace('.md', ''))

    const agentsWithoutCommands = agents.filter((agent) => {
      const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
      return !generatedCommandNames.includes(commandName)
    })

    if (agentsWithoutCommands.length > 0) {
      Logger.info(
        `\n💡 ${agentsWithoutCommands.length} agent${agentsWithoutCommands.length === 1 ? '' : 's'} without generated commands.`
      )
      Logger.dim('Run `ccsa generate` to create slash commands for all agents.')
    }
  }
}
