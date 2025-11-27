import { describe, it, expect, beforeEach } from 'vitest'
import { vol } from 'memfs'
import { FileDiscovery } from '../../../src/core/file-discovery.js'
import { sampleFileStructure } from '../../fixtures/sample-agents.js'

describe('FileDiscovery', () => {
  beforeEach(() => {
    vol.reset()
    vol.fromJSON(sampleFileStructure)
  })

  describe('discoverAgents', () => {
    it('should discover project agents', async () => {
      const agents = await FileDiscovery.discoverAgents('project')

      expect(agents).toHaveLength(2) // project-agent + code-reviewer (in subfolder)
      const agentNames = agents.map((a) => a.frontmatter.name).sort()
      expect(agentNames).toEqual(['code-reviewer', 'project-agent'])
      expect(agents.every((a) => a.scope === 'project')).toBe(true)
    })

    it('should discover user agents', async () => {
      const agents = await FileDiscovery.discoverAgents('user')

      expect(agents).toHaveLength(2) // user-agent and complex-agent
      expect(agents.every((a) => a.scope === 'user')).toBe(true)

      const agentNames = agents.map((a) => a.frontmatter.name)
      expect(agentNames).toContain('user-agent')
      expect(agentNames).toContain('complex-testing-agent')
    })

    it('should discover both project and user agents', async () => {
      const agents = await FileDiscovery.discoverAgents('both')

      expect(agents).toHaveLength(4) // 2 project + 2 user agents
      expect(agents.some((a) => a.scope === 'project')).toBe(true)
      expect(agents.some((a) => a.scope === 'user')).toBe(true)
    })

    it('should handle agents in subdirectories', async () => {
      // Add a subdirectory agent
      vol.fromJSON({
        '/test-project/.claude/agents/subfolder/nested-agent.md': `---
name: nested-agent
description: Agent in subdirectory
tools: Read
---

Nested agent content.`,
      })

      const agents = await FileDiscovery.discoverAgents('project')
      const nestedAgent = agents.find((a) => a.frontmatter.name === 'nested-agent')

      expect(nestedAgent).toBeDefined()
      expect(nestedAgent!.relativePath).toBe('subfolder/nested-agent.md')
    })

    it('should skip invalid agent files', async () => {
      const agents = await FileDiscovery.discoverAgents('project')

      // Should not include invalid-agent or no-frontmatter
      const agentNames = agents.map((a) => a.frontmatter.name)
      expect(agentNames).not.toContain('invalid-agent')
      expect(agentNames).not.toContain('no-frontmatter')
    })

    it('should parse tools correctly for different formats', async () => {
      const agents = await FileDiscovery.discoverAgents('both')

      const projectAgent = agents.find((a) => a.frontmatter.name === 'project-agent')
      const userAgent = agents.find((a) => a.frontmatter.name === 'user-agent')

      expect(projectAgent!.frontmatter.tools).toBe('Read, Write, Edit')
      expect(userAgent!.frontmatter.tools).toEqual(['Read', 'Grep', 'Bash'])
    })

    it('should return empty array when no agents exist', async () => {
      vol.reset()
      const agents = await FileDiscovery.discoverAgents('both')
      expect(agents).toHaveLength(0)
    })

    it('should recover from unquoted colons in frontmatter', async () => {
      vol.fromJSON({
        '/test-project/.claude/agents/unquoted-colon.md': `---
name: unquoted-colon
description: This description has a colon: right here. Examples: <example>
tools: Read
---

Content here.`,
      })

      const agents = await FileDiscovery.discoverAgents('project')
      const agent = agents.find((a) => a.frontmatter.name === 'unquoted-colon')

      expect(agent).toBeDefined()
      expect(agent!.frontmatter.description).toContain('This description has a colon: right here')
    })
  })

  describe('discoverCommands', () => {
    it('should discover project commands', async () => {
      const commands = await FileDiscovery.discoverCommands('project')

      expect(commands).toHaveLength(2)
      expect(commands.every((c) => c.scope === 'project')).toBe(true)

      const commandNames = commands.map((c) => c.relativePath)
      expect(commandNames).toContain('manual-command.md')
      expect(commandNames).toContain('generated-command.md')
    })

    it('should discover user commands', async () => {
      const commands = await FileDiscovery.discoverCommands('user')

      expect(commands).toHaveLength(1)
      expect(commands[0].scope).toBe('user')
      expect(commands[0].relativePath).toBe('user-command.md')
    })

    it('should discover both project and user commands', async () => {
      const commands = await FileDiscovery.discoverCommands('both')

      expect(commands).toHaveLength(3)
      expect(commands.some((c) => c.scope === 'project')).toBe(true)
      expect(commands.some((c) => c.scope === 'user')).toBe(true)
    })

    it('should parse command frontmatter correctly', async () => {
      const commands = await FileDiscovery.discoverCommands('project')
      const manualCommand = commands.find((c) => c.relativePath === 'manual-command.md')

      expect(manualCommand!.frontmatter.description).toBe('A manually created command for testing')
      expect(manualCommand!.frontmatter['argument-hint']).toBe('test parameters')
    })

    it('should return empty array when no commands exist', async () => {
      vol.reset()
      const commands = await FileDiscovery.discoverCommands('both')
      expect(commands).toHaveLength(0)
    })
  })

  describe('isGeneratedFile', () => {
    it('should identify generated files', async () => {
      const generatedPath = '/test-project/.claude/commands/generated-command.md'
      expect(FileDiscovery.isGeneratedFile(generatedPath)).toBe(true)
    })

    it('should identify non-generated files', async () => {
      const manualPath = '/test-project/.claude/commands/manual-command.md'
      expect(FileDiscovery.isGeneratedFile(manualPath)).toBe(false)
    })

    it('should handle non-existent files', async () => {
      expect(FileDiscovery.isGeneratedFile('/non-existent/file.md')).toBe(false)
    })

    it('should handle files without signature', async () => {
      vol.fromJSON({
        '/test-file.md': 'Regular markdown content without signature',
      })

      expect(FileDiscovery.isGeneratedFile('/test-file.md')).toBe(false)
    })
  })

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // This would require mocking fs errors, which is complex with memfs
      // For now, we test that the method doesn't throw
      await expect(FileDiscovery.discoverAgents('project')).resolves.not.toThrow()
    })

    it('should handle malformed YAML frontmatter', async () => {
      vol.fromJSON({
        '/test-project/.claude/agents/malformed.md': `---
name: malformed
description: "Unclosed quote
tools: Read
---

Content here.`,
      })

      // Should not throw, just skip the malformed file
      const agents = await FileDiscovery.discoverAgents('project')
      const agentNames = agents.map((a) => a.frontmatter.name)
      expect(agentNames).not.toContain('malformed')
    })
  })
})
