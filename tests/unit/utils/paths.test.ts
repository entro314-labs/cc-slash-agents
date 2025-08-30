import { describe, it, expect, beforeEach, vi } from 'vitest'
import { vol } from 'memfs'
import { PathUtils } from '../../../src/utils/paths.js'

describe('PathUtils', () => {
  beforeEach(() => {
    vol.reset()
  })

  describe('getUserClaudeDir', () => {
    it('should return correct user Claude directory', () => {
      const result = PathUtils.getUserClaudeDir()
      expect(result).toMatch(/\.claude$/)
    })
  })

  describe('getProjectClaudeDir', () => {
    it('should return project Claude directory in cwd', () => {
      const result = PathUtils.getProjectClaudeDir()
      expect(result).toBe('/test-project/.claude')
    })

    it('should return Claude directory for custom path', () => {
      const result = PathUtils.getProjectClaudeDir('/custom/path')
      expect(result).toBe('/custom/path/.claude')
    })
  })

  describe('getUserAgentsDir', () => {
    it('should return user agents directory', () => {
      const result = PathUtils.getUserAgentsDir()
      expect(result).toMatch(/\.claude\/agents$/)
    })
  })

  describe('getProjectAgentsDir', () => {
    it('should return project agents directory', () => {
      const result = PathUtils.getProjectAgentsDir()
      expect(result).toBe('/test-project/.claude/agents')
    })
  })

  describe('getUserCommandsDir', () => {
    it('should return user commands directory', () => {
      const result = PathUtils.getUserCommandsDir()
      expect(result).toMatch(/\.claude\/commands$/)
    })
  })

  describe('getProjectCommandsDir', () => {
    it('should return project commands directory', () => {
      const result = PathUtils.getProjectCommandsDir()
      expect(result).toBe('/test-project/.claude/commands')
    })
  })

  describe('exists', () => {
    it('should return true for existing paths', () => {
      vol.fromJSON({ '/existing/path': 'content' })
      expect(PathUtils.exists('/existing/path')).toBe(true)
    })

    it('should return false for non-existing paths', () => {
      expect(PathUtils.exists('/non-existing/path')).toBe(false)
    })
  })

  describe('expandPath', () => {
    it('should expand ~ to home directory', () => {
      const result = PathUtils.expandPath('~/test/path')
      expect(result).toMatch(/\/test\/path$/)
      expect(result).not.toMatch(/^~/)
    })

    it('should resolve absolute paths', () => {
      const result = PathUtils.expandPath('/absolute/path')
      expect(result).toBe('/absolute/path')
    })

    it('should resolve relative paths', () => {
      const result = PathUtils.expandPath('relative/path')
      expect(result).toMatch(/\/relative\/path$/)
    })
  })

  describe('isClaudeProject', () => {
    it('should return true if .claude directory exists', () => {
      vol.fromJSON({ '/test-project/.claude/test': 'content' })
      expect(PathUtils.isClaudeProject()).toBe(true)
    })

    it('should return false if .claude directory does not exist', () => {
      expect(PathUtils.isClaudeProject()).toBe(false)
    })

    it('should check custom directory', () => {
      vol.fromJSON({ '/custom/.claude/test': 'content' })
      expect(PathUtils.isClaudeProject('/custom')).toBe(true)
    })
  })

  describe('getValidAgentsDirs', () => {
    beforeEach(() => {
      vol.fromJSON({
        '/test-project/.claude/agents/agent1.md': 'content',
        '/Users/testuser/.claude/agents/agent2.md': 'content',
      })
    })

    it('should return both directories when scope is both', () => {
      const result = PathUtils.getValidAgentsDirs('both')
      expect(result).toHaveLength(2)
      expect(result.some((d) => d.scope === 'project')).toBe(true)
      expect(result.some((d) => d.scope === 'user')).toBe(true)
    })

    it('should return only project directory when scope is project', () => {
      const result = PathUtils.getValidAgentsDirs('project')
      expect(result).toHaveLength(1)
      expect(result[0].scope).toBe('project')
      expect(result[0].path).toBe('/test-project/.claude/agents')
    })

    it('should return only user directory when scope is user', () => {
      const result = PathUtils.getValidAgentsDirs('user')
      expect(result).toHaveLength(1)
      expect(result[0].scope).toBe('user')
    })

    it('should return empty array when no directories exist', () => {
      vol.reset()
      const result = PathUtils.getValidAgentsDirs('both')
      expect(result).toHaveLength(0)
    })
  })
})
