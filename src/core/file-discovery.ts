import { glob } from 'glob'
import { readFileSync, existsSync } from 'fs'
import { join, relative } from 'path'
import matter from 'gray-matter'
import type { AgentFile, CommandFile, AgentFrontmatter, CommandFrontmatter } from '../types.js'
import { PathUtils } from '../utils/paths.js'
import { Logger } from '../utils/logger.js'

export class FileDiscovery {
  /**
   * Discover all agent files in specified scopes
   */
  static async discoverAgents(scope: 'project' | 'user' | 'both' = 'both'): Promise<AgentFile[]> {
    const agents: AgentFile[] = []
    const agentsDirs = PathUtils.getValidAgentsDirs(scope)

    for (const { path: agentsDir, scope: dirScope } of agentsDirs) {
      try {
        Logger.debug(`Scanning agents directory: ${agentsDir}`)
        const pattern = join(agentsDir, '**/*.md').replace(/\\/g, '/')
        const files = await glob(pattern)

        for (const filePath of files) {
          try {
            const agent = FileDiscovery.parseAgentFile(filePath, agentsDir, dirScope)
            if (agent) {
              agents.push(agent)
              Logger.debug(`Found agent: ${agent.frontmatter.name} (${dirScope})`)
            }
          } catch (error) {
            Logger.warning(`Failed to parse agent file ${filePath}: ${error}`)
          }
        }
      } catch (error) {
        Logger.debug(`Error scanning ${agentsDir}: ${error}`)
      }
    }

    return agents
  }

  /**
   * Discover all existing command files in specified scopes
   */
  static async discoverCommands(scope: 'project' | 'user' | 'both' = 'both'): Promise<CommandFile[]> {
    const commands: CommandFile[] = []
    const commandsDirs: Array<{ path: string; scope: 'project' | 'user' }> = []

    if (scope === 'both' || scope === 'project') {
      const projectDir = PathUtils.getProjectCommandsDir()
      if (PathUtils.exists(projectDir)) {
        commandsDirs.push({ path: projectDir, scope: 'project' })
      }
    }

    if (scope === 'both' || scope === 'user') {
      const userDir = PathUtils.getUserCommandsDir()
      if (PathUtils.exists(userDir)) {
        commandsDirs.push({ path: userDir, scope: 'user' })
      }
    }

    for (const { path: commandsDir, scope: dirScope } of commandsDirs) {
      try {
        Logger.debug(`Scanning commands directory: ${commandsDir}`)
        const pattern = join(commandsDir, '**/*.md').replace(/\\/g, '/')
        const files = await glob(pattern)

        for (const filePath of files) {
          try {
            const command = FileDiscovery.parseCommandFile(filePath, commandsDir, dirScope)
            if (command) {
              commands.push(command)
              Logger.debug(`Found command: ${relative(commandsDir, filePath)} (${dirScope})`)
            }
          } catch (error) {
            Logger.warning(`Failed to parse command file ${filePath}: ${error}`)
          }
        }
      } catch (error) {
        Logger.debug(`Error scanning ${commandsDir}: ${error}`)
      }
    }

    return commands
  }

  /**
   * Parse an individual agent file
   */
  private static parseAgentFile(filePath: string, baseDir: string, scope: 'project' | 'user'): AgentFile | null {
    if (!existsSync(filePath)) {
      return null
    }

    const content = readFileSync(filePath, 'utf-8')
    let parsed: matter.GrayMatterFile<string>

    try {
      parsed = matter(content)
    } catch (error) {
      // Try to recover from common YAML errors (like unquoted colons in values)
      try {
        const fixedContent = FileDiscovery.fixFrontmatter(content)
        parsed = matter(fixedContent)
        Logger.debug(`Recovered malformed agent file: ${filePath}`)
      } catch (retryError) {
        // If recovery fails, throw the original error to be caught by the caller
        throw error
      }
    }

    // Validate required frontmatter fields
    const frontmatter = parsed.data as AgentFrontmatter
    if (!(frontmatter.name && frontmatter.description)) {
      Logger.debug(`Skipping ${filePath}: missing required frontmatter (name, description)`)
      return null
    }

    return {
      path: filePath,
      relativePath: relative(baseDir, filePath),
      frontmatter,
      content: parsed.content,
      scope,
    }
  }

  /**
   * Parse an individual command file
   */
  private static parseCommandFile(filePath: string, baseDir: string, scope: 'project' | 'user'): CommandFile | null {
    if (!existsSync(filePath)) {
      return null
    }

    const content = readFileSync(filePath, 'utf-8')
    const parsed = matter(content)

    return {
      path: filePath,
      relativePath: relative(baseDir, filePath),
      frontmatter: parsed.data as CommandFrontmatter,
      content: parsed.content,
      scope,
    }
  }

  /**
   * Attempt to fix common frontmatter issues
   */
  private static fixFrontmatter(content: string): string {
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) return content

    const frontmatter = match[1]
    const lines = frontmatter.split('\n')
    const fixedLines = lines.map(line => {
      const keyValMatch = line.match(/^(\s*[\w-]+):\s*(.*)$/)
      if (keyValMatch) {
        const key = keyValMatch[1]
        let value = keyValMatch[2]

        // If value is not empty, not quoted, and contains special chars that might confuse YAML
        // We skip values that look like arrays or objects (start with [ or {)
        if (value &&
            !value.startsWith('"') &&
            !value.startsWith("'") &&
            !value.startsWith("[") &&
            !value.startsWith("{") &&
            (value.includes(':') || value.includes('#'))) {

          // Escape existing double quotes
          value = value.replace(/"/g, '\\"')
          return `${key}: "${value}"`
        }
      }
      return line
    })

    const newFrontmatter = fixedLines.join('\n')
    return content.replace(match[1], newFrontmatter)
  }

  /**
   * Check if a file was generated by ccsa (contains our signature)
   */
  static isGeneratedFile(filePath: string): boolean {
    if (!existsSync(filePath)) {
      return false
    }

    try {
      const content = readFileSync(filePath, 'utf-8')
      return content.includes('Generated by cc-slash-agents') || content.includes('<!-- ccsa:generated -->')
    } catch {
      return false
    }
  }
}
