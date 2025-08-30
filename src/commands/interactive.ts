import type { Command } from 'commander'
import { intro, outro, select, multiselect, confirm, text, spinner } from '@clack/prompts'
import { isCancel, cancel } from '@clack/prompts'
import { FileDiscovery } from '../core/file-discovery.js'
import { CommandGenerator } from '../core/command-generator.js'
import { Logger } from '../utils/logger.js'
import chalk from 'chalk'

export function addInteractiveCommand(program: Command) {
  program
    .command('interactive')
    .alias('i')
    .description('Interactive mode with guided prompts')
    .action(async () => {
      try {
        await runInteractiveMode()
      } catch (error) {
        Logger.error(`Interactive mode failed: ${error}`)
        process.exit(1)
      }
    })
}

async function runInteractiveMode() {
  intro(chalk.cyan('🤖 cc-slash-agents Interactive Mode'))

  // Discover agents
  const s = spinner()
  s.start('Discovering agents...')

  const agents = await FileDiscovery.discoverAgents('both')
  const commands = await FileDiscovery.discoverCommands('both')

  s.stop('Found agents and commands')

  if (agents.length === 0) {
    outro(chalk.yellow('No agents found. Run `ccsa init` to get started.'))
    return
  }

  // Main menu
  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'generate', label: '🚀 Generate slash commands from agents' },
      { value: 'review', label: '📋 Review and select specific agents' },
      { value: 'sync', label: '🔄 Sync existing commands' },
      { value: 'clean', label: '🧹 Clean up generated commands' },
      { value: 'explore', label: '🔍 Explore available agents' },
    ],
  })

  if (isCancel(action)) {
    cancel('Operation cancelled')
    return
  }

  switch (action) {
    case 'generate':
      await interactiveGenerate(agents)
      break
    case 'review':
      await interactiveReview(agents)
      break
    case 'sync':
      await interactiveSync(agents, commands)
      break
    case 'clean':
      await interactiveClean(commands)
      break
    case 'explore':
      await interactiveExplore(agents)
      break
  }
}

async function interactiveGenerate(agents: any[]) {
  const scope = await select({
    message: 'Which agents should we generate commands for?',
    options: [
      { value: 'project', label: '📁 Project agents only (.claude/agents/)' },
      { value: 'user', label: '👤 User agents only (~/.claude/agents/)' },
      { value: 'both', label: '🌍 Both project and user agents' },
    ],
  })

  if (isCancel(scope)) {
    cancel('Operation cancelled')
    return
  }

  const filteredAgents = agents.filter((agent) => scope === 'both' || agent.scope === scope)

  if (filteredAgents.length === 0) {
    outro(chalk.yellow(`No agents found in ${scope} scope.`))
    return
  }

  const preview = await confirm({
    message: `Generate ${filteredAgents.length} slash commands?`,
    initialValue: true,
  })

  if (isCancel(preview) || !preview) {
    cancel('Operation cancelled')
    return
  }

  // Generate commands
  const s = spinner()
  s.start('Generating commands...')

  let generated = 0
  const errors: string[] = []

  for (const agent of filteredAgents) {
    try {
      const targetScope = scope === 'both' ? 'project' : (scope as 'project' | 'user')
      await CommandGenerator.generateCommand(agent, targetScope, false)
      generated++
    } catch (error) {
      errors.push(`${agent.frontmatter.name}: ${error}`)
    }
  }

  s.stop('Generation complete')

  if (generated > 0) {
    outro(chalk.green(`✅ Generated ${generated} slash commands! Use them with / in Claude Code.`))
  }

  if (errors.length > 0) {
    console.log(chalk.red('\nErrors:'))
    for (const error of errors) {
      console.log(chalk.red(`  • ${error}`))
    }
  }
}

async function interactiveReview(agents: any[]) {
  const nameMap = CommandGenerator.resolveNamingConflicts(agents)

  const agentOptions = agents.map((agent) => ({
    value: agent.frontmatter.name,
    label: `${agent.frontmatter.name} → /${nameMap.get(agent.frontmatter.name)} (${agent.scope})`,
    hint: agent.frontmatter.description.substring(0, 60) + '...',
  }))

  const selectedAgents = await multiselect({
    message: 'Select agents to generate commands for:',
    options: agentOptions,
    required: false,
  })

  if (isCancel(selectedAgents) || selectedAgents.length === 0) {
    cancel('No agents selected')
    return
  }

  const targetScope = await select({
    message: 'Where should commands be generated?',
    options: [
      { value: 'project', label: '📁 Project commands (.claude/commands/)' },
      { value: 'user', label: '👤 User commands (~/.claude/commands/)' },
    ],
  })

  if (isCancel(targetScope)) {
    cancel('Operation cancelled')
    return
  }

  // Generate selected commands
  const s = spinner()
  s.start(`Generating ${selectedAgents.length} commands...`)

  let generated = 0
  for (const agentName of selectedAgents) {
    const agent = agents.find((a) => a.frontmatter.name === agentName)
    if (agent) {
      try {
        await CommandGenerator.generateCommand(agent, targetScope as any, true)
        generated++
      } catch (error) {
        // Log error but continue
        Logger.debug(`Failed to generate ${agentName}: ${error}`)
      }
    }
  }

  s.stop('Generation complete')
  outro(chalk.green(`✅ Generated ${generated} custom slash commands!`))
}

async function interactiveSync(agents: any[], commands: any[]) {
  const generatedCommands = commands.filter((c) => FileDiscovery.isGeneratedFile(c.path))

  if (generatedCommands.length === 0) {
    outro(chalk.yellow('No generated commands found to sync.'))
    return
  }

  const proceed = await confirm({
    message: `Sync ${generatedCommands.length} generated commands with current agents?`,
    initialValue: true,
  })

  if (isCancel(proceed) || !proceed) {
    cancel('Sync cancelled')
    return
  }

  const s = spinner()
  s.start('Syncing commands...')

  // Simple sync - regenerate all commands
  let synced = 0
  for (const agent of agents) {
    try {
      const targetScope = agent.scope
      await CommandGenerator.generateCommand(agent, targetScope, true)
      synced++
    } catch (error) {
      Logger.debug(`Failed to sync ${agent.frontmatter.name}: ${error}`)
    }
  }

  s.stop('Sync complete')
  outro(chalk.green(`✅ Synced ${synced} commands!`))
}

async function interactiveClean(commands: any[]) {
  const generatedCommands = commands.filter((c) => FileDiscovery.isGeneratedFile(c.path))

  if (generatedCommands.length === 0) {
    outro(chalk.yellow('No generated commands found to clean.'))
    return
  }

  const commandList = generatedCommands.map((c) => `  • /${c.relativePath.replace('.md', '')} (${c.scope})`).join('\n')

  console.log(chalk.yellow(`\nGenerated commands to remove:\n${commandList}\n`))

  const confirm = await select({
    message: `Delete ${generatedCommands.length} generated commands?`,
    options: [
      { value: 'yes', label: '🗑️  Yes, delete all generated commands' },
      { value: 'no', label: '❌ No, keep them' },
    ],
  })

  if (isCancel(confirm) || confirm === 'no') {
    cancel('Clean cancelled')
    return
  }

  const s = spinner()
  s.start('Cleaning commands...')

  let deleted = 0
  for (const command of generatedCommands) {
    try {
      const fs = await import('fs')
      fs.unlinkSync(command.path)
      deleted++
    } catch (error) {
      Logger.debug(`Failed to delete ${command.path}: ${error}`)
    }
  }

  s.stop('Clean complete')
  outro(chalk.green(`✅ Deleted ${deleted} generated commands!`))
}

async function interactiveExplore(agents: any[]) {
  const projectAgents = agents.filter((a) => a.scope === 'project')
  const userAgents = agents.filter((a) => a.scope === 'user')

  console.log(chalk.cyan('\n📊 Agent Overview:'))
  console.log(`  📁 Project agents: ${projectAgents.length}`)
  console.log(`  👤 User agents: ${userAgents.length}`)
  console.log(`  🔢 Total: ${agents.length}`)

  const exploreType = await select({
    message: 'What would you like to explore?',
    options: [
      { value: 'by-category', label: '📂 Browse by category/directory' },
      { value: 'by-scope', label: '🎯 Browse by scope (project/user)' },
      { value: 'search', label: '🔍 Search agents by name or description' },
    ],
  })

  if (isCancel(exploreType)) {
    cancel('Exploration cancelled')
    return
  }

  switch (exploreType) {
    case 'by-category':
      await exploreByCategory(agents)
      break
    case 'by-scope':
      await exploreByScope(agents)
      break
    case 'search':
      await exploreBySearch(agents)
      break
  }
}

async function exploreByCategory(agents: any[]) {
  // Group agents by directory
  const categories = new Map<string, any[]>()

  for (const agent of agents) {
    const dir = agent.relativePath.includes('/') ? agent.relativePath.split('/')[0] : 'root'

    if (!categories.has(dir)) {
      categories.set(dir, [])
    }
    categories.get(dir)!.push(agent)
  }

  const categoryOptions = Array.from(categories.entries()).map(([dir, agentList]) => ({
    value: dir,
    label: `${dir} (${agentList.length} agents)`,
  }))

  const selectedCategory = await select({
    message: 'Select a category to explore:',
    options: categoryOptions,
  })

  if (isCancel(selectedCategory)) {
    return
  }

  const categoryAgents = categories.get(selectedCategory)!
  console.log(chalk.cyan(`\n📂 ${selectedCategory} Agents:`))

  for (const agent of categoryAgents) {
    const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
    console.log(chalk.white(`  • ${agent.frontmatter.name} → /${commandName} (${agent.scope})`))
    console.log(chalk.dim(`    ${agent.frontmatter.description.substring(0, 80)}...`))
  }

  outro(chalk.green(`Found ${categoryAgents.length} agents in ${selectedCategory}`))
}

async function exploreByScope(agents: any[]) {
  const scope = await select({
    message: 'Which scope to explore?',
    options: [
      { value: 'project', label: '📁 Project agents' },
      { value: 'user', label: '👤 User agents' },
    ],
  })

  if (isCancel(scope)) {
    return
  }

  const scopeAgents = agents.filter((a) => a.scope === scope)

  console.log(
    chalk.cyan(`\n${scope === 'project' ? '📁' : '👤'} ${scope.charAt(0).toUpperCase() + scope.slice(1)} Agents:`)
  )

  for (const agent of scopeAgents) {
    const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
    console.log(chalk.white(`  • ${agent.frontmatter.name} → /${commandName}`))
    console.log(chalk.dim(`    ${agent.frontmatter.description.substring(0, 80)}...`))
  }

  outro(chalk.green(`Found ${scopeAgents.length} ${scope} agents`))
}

async function exploreBySearch(agents: any[]) {
  const searchTerm = await text({
    message: 'Search agents by name or description:',
    placeholder: 'e.g., "review", "test", "docs"',
  })

  if (isCancel(searchTerm) || !searchTerm.trim()) {
    cancel('Search cancelled')
    return
  }

  const term = searchTerm.toLowerCase()
  const matchingAgents = agents.filter(
    (agent) =>
      agent.frontmatter.name.toLowerCase().includes(term) || agent.frontmatter.description.toLowerCase().includes(term)
  )

  if (matchingAgents.length === 0) {
    outro(chalk.yellow(`No agents found matching "${searchTerm}"`))
    return
  }

  console.log(chalk.cyan(`\n🔍 Search Results for "${searchTerm}":`))

  for (const agent of matchingAgents) {
    const commandName = CommandGenerator.generateCommandName(agent.frontmatter.name)
    console.log(chalk.white(`  • ${agent.frontmatter.name} → /${commandName} (${agent.scope})`))
    console.log(chalk.dim(`    ${agent.frontmatter.description.substring(0, 80)}...`))
  }

  outro(chalk.green(`Found ${matchingAgents.length} matching agents`))
}
