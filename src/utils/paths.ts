import { homedir } from 'os'
import { join, resolve } from 'path'
import { existsSync } from 'fs'

export class PathUtils {
  /**
   * Get the user-level Claude directory path
   */
  static getUserClaudeDir(): string {
    return join(homedir(), '.claude')
  }

  /**
   * Get the project-level Claude directory path
   */
  static getProjectClaudeDir(cwd: string = process.cwd()): string {
    return join(cwd, '.claude')
  }

  /**
   * Get user-level agents directory
   */
  static getUserAgentsDir(): string {
    return join(PathUtils.getUserClaudeDir(), 'agents')
  }

  /**
   * Get project-level agents directory
   */
  static getProjectAgentsDir(cwd: string = process.cwd()): string {
    return join(PathUtils.getProjectClaudeDir(cwd), 'agents')
  }

  /**
   * Get user-level commands directory
   */
  static getUserCommandsDir(): string {
    return join(PathUtils.getUserClaudeDir(), 'commands')
  }

  /**
   * Get project-level commands directory
   */
  static getProjectCommandsDir(cwd: string = process.cwd()): string {
    return join(PathUtils.getProjectClaudeDir(cwd), 'commands')
  }

  /**
   * Check if a directory exists
   */
  static exists(path: string): boolean {
    return existsSync(path)
  }

  /**
   * Resolve path with proper handling of ~ for home directory
   */
  static expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(homedir(), path.slice(2))
    }
    return resolve(path)
  }

  /**
   * Check if we're in a project with Claude configuration
   */
  static isClaudeProject(cwd: string = process.cwd()): boolean {
    return PathUtils.exists(PathUtils.getProjectClaudeDir(cwd))
  }

  /**
   * Ensure directory structure exists
   */
  static getValidAgentsDirs(
    scope: 'project' | 'user' | 'both' = 'both'
  ): Array<{ path: string; scope: 'project' | 'user' }> {
    const dirs: Array<{ path: string; scope: 'project' | 'user' }> = []

    if (scope === 'both' || scope === 'project') {
      const projectDir = PathUtils.getProjectAgentsDir()
      if (PathUtils.exists(projectDir)) {
        dirs.push({ path: projectDir, scope: 'project' })
      }
    }

    if (scope === 'both' || scope === 'user') {
      const userDir = PathUtils.getUserAgentsDir()
      if (PathUtils.exists(userDir)) {
        dirs.push({ path: userDir, scope: 'user' })
      }
    }

    return dirs
  }
}
