import { mkdirSync, writeFileSync, existsSync } from 'fs'
import { PathUtils } from '../utils/paths.js'
import { Logger } from '../utils/logger.js'

export async function initializeStructure(options: { global?: boolean }) {
  try {
    if (options.global) {
      await initializeUserStructure()
    } else {
      await initializeProjectStructure()
    }
  } catch (error) {
    throw new Error(`Failed to initialize: ${error}`)
  }
}

async function initializeProjectStructure() {
  Logger.info('Initializing project Claude structure...')

  const claudeDir = PathUtils.getProjectClaudeDir()
  const agentsDir = PathUtils.getProjectAgentsDir()
  const commandsDir = PathUtils.getProjectCommandsDir()

  // Create directories
  Logger.debug(`Creating ${claudeDir}`)
  mkdirSync(claudeDir, { recursive: true })

  Logger.debug(`Creating ${agentsDir}`)
  mkdirSync(agentsDir, { recursive: true })

  Logger.debug(`Creating ${commandsDir}`)
  mkdirSync(commandsDir, { recursive: true })

  // Create example agent if directory is empty
  const exampleAgentPath = `${agentsDir}/example-agent.md`
  if (!existsSync(exampleAgentPath)) {
    const exampleAgent = `---
name: example-agent
description: Example agent demonstrating the basic structure and capabilities. Use PROACTIVELY for demonstration purposes.
tools: Read, Write, Edit
---

You are an example agent that demonstrates how to structure Claude Code agents.

## Your Role

You help users understand:
- How to write effective agent prompts
- The importance of clear descriptions
- Best practices for tool selection

## Instructions

When invoked, you should:
1. Explain what you do
2. Show the user how agents work
3. Provide helpful examples
4. Guide them toward creating their own agents

Remember to be educational and helpful in your responses.
`

    writeFileSync(exampleAgentPath, exampleAgent)
    Logger.success(`Created example agent: ${exampleAgentPath}`)
  }

  // Create README if it doesn't exist
  const readmePath = `${claudeDir}/README.md`
  if (!existsSync(readmePath)) {
    const readme = `# Claude Code Configuration

This directory contains your Claude Code configuration:

## Structure

- \`agents/\` - Custom agents for specialized tasks
- \`commands/\` - Slash commands for quick actions

## Getting Started

1. **Create agents** in the \`agents/\` directory
2. **Generate commands** by running: \`ccsa generate\`
3. **Use commands** in Claude Code with \`/command-name\`

## Agent Format

\`\`\`markdown
---
name: my-agent
description: What this agent does and when to use it
tools: Read, Write, Edit  # Optional
---

Your agent's system prompt goes here...
\`\`\`

## Useful Commands

- \`ccsa list\` - Show all agents and commands
- \`ccsa generate\` - Create slash commands from agents
- \`ccsa sync\` - Update commands when agents change
- \`ccsa clean\` - Remove generated commands

## Learn More

- [Claude Code Documentation](https://docs.anthropic.com/claude-code)
- [cc-slash-agents on GitHub](https://github.com/yourusername/cc-slash-agents)
`

    writeFileSync(readmePath, readme)
    Logger.success(`Created README: ${readmePath}`)
  }

  Logger.success('✅ Project structure initialized!')
  Logger.info('\nNext steps:')
  Logger.dim('  1. Edit agents/example-agent.md or create new agents')
  Logger.dim('  2. Run `ccsa generate` to create slash commands')
  Logger.dim('  3. Use your commands in Claude Code with /command-name')
}

async function initializeUserStructure() {
  Logger.info('Initializing user-level Claude structure...')

  const claudeDir = PathUtils.getUserClaudeDir()
  const agentsDir = PathUtils.getUserAgentsDir()
  const commandsDir = PathUtils.getUserCommandsDir()

  // Create directories
  Logger.debug(`Creating ${claudeDir}`)
  mkdirSync(claudeDir, { recursive: true })

  Logger.debug(`Creating ${agentsDir}`)
  mkdirSync(agentsDir, { recursive: true })

  Logger.debug(`Creating ${commandsDir}`)
  mkdirSync(commandsDir, { recursive: true })

  // Create personal productivity agent
  const productivityAgentPath = `${agentsDir}/productivity-helper.md`
  if (!existsSync(productivityAgentPath)) {
    const productivityAgent = `---
name: productivity-helper
description: Personal productivity assistant for task management, time tracking, and workflow optimization. Use PROACTIVELY for productivity-related requests.
tools: Read, Write, Edit, Bash
---

You are a personal productivity assistant focused on helping with:

## Core Capabilities

- **Task Management**: Breaking down complex projects into actionable steps
- **Time Estimation**: Helping estimate realistic timeframes for tasks
- **Workflow Optimization**: Suggesting improvements to development workflows
- **Documentation**: Creating clear, maintainable documentation
- **Planning**: Project planning and milestone setting

## Your Approach

- Always think about efficiency and sustainability
- Suggest automation where appropriate
- Focus on long-term maintainability
- Consider the human element in productivity systems

## Example Uses

- "Help me break down this feature into tasks"
- "Review my daily workflow for improvements"  
- "Create a project timeline for this feature"
- "Suggest documentation structure for this project"
`

    writeFileSync(productivityAgentPath, productivityAgent)
    Logger.success(`Created productivity agent: ${productivityAgentPath}`)
  }

  Logger.success('✅ User structure initialized!')
  Logger.info('\nNext steps:')
  Logger.dim('  1. Customize agents in ~/.claude/agents/')
  Logger.dim('  2. Run `ccsa generate --scope user` to create commands')
  Logger.dim('  3. Your personal agents will be available across all projects')
}
