import type { Command } from 'commander'
import ora from 'ora'
import { unlinkSync } from 'fs'
import { FileDiscovery } from '../core/file-discovery.js'
import { CommandGenerator } from '../core/command-generator.js'
import { Logger } from '../utils/logger.js'

export function addSyncCommand(program: Command) {
  program
    .command('sync')
    .description('Update generated commands when agents change')
    .option('-s, --scope <scope>', 'Scope to sync: project, user, or both', 'project')
    .option('-c, --clean', 'Remove orphaned generated commands', false)
    .option('-v, --verbose', 'Show detailed output', false)
    .action(async (options) => {
      Logger.setVerbose(options.verbose ?? false)

      try {
        await syncCommands(options)
      } catch (error) {
        Logger.error(`Sync failed: ${error}`)
        process.exit(1)
      }
    })
}

async function syncCommands(options: any) {
  const spinner = ora('Synchronizing commands...').start()

  try {
    const scope = options.scope

    if (!['project', 'user', 'both'].includes(scope)) {
      throw new Error('Scope must be one of: project, user, both')
    }

    // Discover current agents and commands
    const agents = await FileDiscovery.discoverAgents(scope)
    const existingCommands = await FileDiscovery.discoverCommands(scope)

    spinner.succeed(`Found ${agents.length} agents and ${existingCommands.length} existing commands`)

    if (agents.length === 0) {
      Logger.warning('No agents found to sync')
      return
    }

    // Filter to only generated commands
    const generatedCommands = existingCommands.filter((c) => FileDiscovery.isGeneratedFile(c.path))

    Logger.header('\n🔄 Sync Analysis:')
    Logger.log(`  Agents: ${agents.length}`)
    Logger.log(`  Generated commands: ${generatedCommands.length}`)
    Logger.log(`  Manual commands: ${existingCommands.length - generatedCommands.length}`)

    // Create mapping of agent names to expected command names
    const nameMap = CommandGenerator.resolveNamingConflicts(agents)
    const expectedCommands = new Set(nameMap.values())

    // Find commands to update
    const toUpdate: any[] = []
    const toCreate: any[] = []
    const toDelete: string[] = []

    // Check which agents need command updates
    for (const agent of agents) {
      const expectedCommandName = nameMap.get(agent.frontmatter.name)
      const existingCommand = generatedCommands.find((c) => {
        const commandName = c.relativePath.replace('.md', '')
        return commandName === expectedCommandName
      })

      if (existingCommand) {
        toUpdate.push({ agent, command: existingCommand })
      } else {
        toCreate.push(agent)
      }
    }

    // Find orphaned generated commands
    if (options.clean) {
      for (const command of generatedCommands) {
        const commandName = command.relativePath.replace('.md', '')
        if (!expectedCommands.has(commandName)) {
          toDelete.push(command.path)
        }
      }
    }

    // Show what will be done
    if (toCreate.length > 0) {
      Logger.info(`\n➕ Commands to create (${toCreate.length}):`)
      for (const agent of toCreate) {
        const commandName = nameMap.get(agent.frontmatter.name)
        Logger.log(`  • /${commandName} (from ${agent.frontmatter.name})`)
      }
    }

    if (toUpdate.length > 0) {
      Logger.info(`\n🔄 Commands to update (${toUpdate.length}):`)
      for (const { agent, command } of toUpdate) {
        const commandName = nameMap.get(agent.frontmatter.name)
        Logger.log(`  • /${commandName} (${agent.frontmatter.name})`)
      }
    }

    if (toDelete.length > 0 && options.clean) {
      Logger.warning(`\n🗑️  Orphaned commands to delete (${toDelete.length}):`)
      for (const path of toDelete) {
        const parts = path.split('/')
        const fileName = parts[parts.length - 1]
        Logger.log(`  • ${fileName.replace('.md', '')}`)
      }
    }

    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      Logger.success('✅ All commands are already up to date!')
      return
    }

    // Perform the sync operations
    const syncSpinner = ora('Syncing commands...').start()

    let created = 0
    let updated = 0
    let deleted = 0
    const errors: string[] = []

    // Create new commands
    for (const agent of toCreate) {
      try {
        const targetScope = scope === 'both' ? 'project' : (scope as 'project' | 'user')
        await CommandGenerator.generateCommand(agent, targetScope, true)
        created++
      } catch (error) {
        errors.push(`Failed to create command for ${agent.frontmatter.name}: ${error}`)
      }
    }

    // Update existing commands
    for (const { agent } of toUpdate) {
      try {
        const targetScope = scope === 'both' ? 'project' : (scope as 'project' | 'user')
        await CommandGenerator.generateCommand(agent, targetScope, true)
        updated++
      } catch (error) {
        errors.push(`Failed to update command for ${agent.frontmatter.name}: ${error}`)
      }
    }

    // Delete orphaned commands
    if (options.clean) {
      for (const path of toDelete) {
        try {
          unlinkSync(path)
          deleted++
        } catch (error) {
          errors.push(`Failed to delete ${path}: ${error}`)
        }
      }
    }

    syncSpinner.succeed('Sync completed')

    // Report results
    Logger.header('\n✅ Sync Summary:')

    if (created > 0) {
      Logger.success(`Created: ${created} command${created === 1 ? '' : 's'}`)
    }

    if (updated > 0) {
      Logger.success(`Updated: ${updated} command${updated === 1 ? '' : 's'}`)
    }

    if (deleted > 0) {
      Logger.success(`Deleted: ${deleted} orphaned command${deleted === 1 ? '' : 's'}`)
    }

    if (errors.length > 0) {
      Logger.error(`\nErrors (${errors.length}):`)
      for (const error of errors) {
        Logger.log(`  • ${error}`)
      }
    }

    if (created + updated + deleted > 0) {
      Logger.header('\n🚀 Next Steps:')
      Logger.info('Your commands have been synchronized!')
      Logger.dim('Type / in Claude Code to see updated commands.')
      Logger.dim('Run `ccsa list` to verify the changes.')
    }
  } catch (error) {
    spinner.fail('Sync failed')
    throw error
  }
}
