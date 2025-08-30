export interface AgentFrontmatter {
  name: string
  description: string
  tools?: string[] | string
  model?: string
}

export interface CommandFrontmatter {
  description?: string
  'argument-hint'?: string
  'allowed-tools'?: string[]
  model?: string
}

export interface AgentFile {
  path: string
  relativePath: string
  frontmatter: AgentFrontmatter
  content: string
  scope: 'project' | 'user'
}

export interface CommandFile {
  path: string
  relativePath: string
  frontmatter: CommandFrontmatter
  content: string
  scope: 'project' | 'user'
}

export interface GeneratedCommand {
  agentFile: AgentFile
  commandName: string
  commandPath: string
  content: string
}

export interface GenerateOptions {
  scope: 'project' | 'user' | 'both'
  dryRun?: boolean
  force?: boolean
  verbose?: boolean
}
