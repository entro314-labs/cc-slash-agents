import { unlinkSync } from 'fs'
import { createInterface } from 'readline'
import { FileDiscovery } from '../core/file-discovery.js'
import { Logger } from '../utils/logger.js'

export async function cleanCommands(options: { scope: string; yes?: boolean }) {
  try {
    const scope = options.scope

    if (!['project', 'user', 'both'].includes(scope)) {
      throw new Error('Scope must be one of: project, user, both')
    }

    Logger.info(`Cleaning generated commands (${scope} scope)...`)

    // Discover all commands
    const commands = await FileDiscovery.discoverCommands(scope as any)

    // Filter to only generated commands
    const generatedCommands = commands.filter((command) => FileDiscovery.isGeneratedFile(command.path))

    if (generatedCommands.length === 0) {
      Logger.info('No generated commands found to clean.')
      return
    }

    // Show what will be deleted
    Logger.warning(
      `\nFound ${generatedCommands.length} generated command${generatedCommands.length === 1 ? '' : 's'} to delete:`
    )

    const projectCommands = generatedCommands.filter((c) => c.scope === 'project')
    const userCommands = generatedCommands.filter((c) => c.scope === 'user')

    if (projectCommands.length > 0) {
      Logger.info('\n📁 Project commands:')
      for (const command of projectCommands) {
        const commandName = command.relativePath.replace('.md', '')
        Logger.log(`  • /${commandName}`)
      }
    }

    if (userCommands.length > 0) {
      Logger.info('\n👤 User commands:')
      for (const command of userCommands) {
        const commandName = command.relativePath.replace('.md', '')
        Logger.log(`  • /${commandName}`)
      }
    }

    // Confirm deletion unless --yes flag is used
    if (!options.yes) {
      const confirmed = await confirmDeletion(generatedCommands.length)
      if (!confirmed) {
        Logger.info('Operation cancelled.')
        return
      }
    }

    // Delete the files
    let deleted = 0
    const errors: string[] = []

    for (const command of generatedCommands) {
      try {
        unlinkSync(command.path)
        deleted++
        Logger.debug(`Deleted: ${command.path}`)
      } catch (error) {
        errors.push(`Failed to delete ${command.relativePath}: ${error}`)
      }
    }

    // Report results
    Logger.success(`\n✅ Clean completed: ${deleted}/${generatedCommands.length} commands deleted`)

    if (errors.length > 0) {
      Logger.error(`\nErrors (${errors.length}):`)
      for (const error of errors) {
        Logger.log(`  • ${error}`)
      }
    }

    if (deleted > 0) {
      Logger.info('\nYour generated commands have been removed.')
      Logger.dim('Run `ccsa generate` to recreate them from your agents.')
      Logger.dim('Manual commands were not affected.')
    }
  } catch (error) {
    throw new Error(`Clean failed: ${error}`)
  }
}

function confirmDeletion(count: number): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const message =
      count === 1 ? '\nDelete this generated command? (y/N): ' : `\nDelete all ${count} generated commands? (y/N): `

    rl.question(message, (answer) => {
      rl.close()
      const confirmed = answer.toLowerCase().trim() === 'y' || answer.toLowerCase().trim() === 'yes'
      resolve(confirmed)
    })
  })
}
