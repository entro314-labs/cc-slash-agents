import { vi } from 'vitest'
import { vol } from 'memfs'

// Mock fs module with memfs for isolated testing
vi.mock('fs', async () => {
  const memfs = await import('memfs')
  return memfs.fs
})

vi.mock('fs/promises', async () => {
  const memfs = await import('memfs')
  return memfs.fs.promises
})

// Mock os module for homedir
vi.mock('os', async () => {
  return {
    homedir: () => '/Users/testuser',
  }
})

// Mock glob to work with memfs
vi.mock('glob', async () => {
  return {
    glob: async (pattern: string) => {
      const memfs = await import('memfs')
      const path = await import('path')
      const fs = memfs.fs

      // Simple glob implementation for testing
      const files: string[] = []

      // Extract base directory from pattern
      let baseDir = pattern
      if (baseDir.includes('**')) {
        baseDir = baseDir.split('**')[0]
      }
      if (baseDir.endsWith('/')) {
        baseDir = baseDir.slice(0, -1)
      }

      try {
        const traverse = (dir: string) => {
          try {
            const entries = fs.readdirSync(dir)
            for (const entry of entries) {
              const fullPath = path.join(dir, entry as string).replace(/\\/g, '/')
              try {
                const stat = fs.statSync(fullPath)
                if (stat.isDirectory()) {
                  traverse(fullPath)
                } else if (entry.toString().endsWith('.md')) {
                  files.push(fullPath)
                }
              } catch {
                // File stat failed, skip
              }
            }
          } catch {
            // Directory doesn't exist or can't be read
          }
        }

        if (fs.existsSync && fs.existsSync(baseDir)) {
          traverse(baseDir)
        }
      } catch {
        // Base directory doesn't exist
      }

      return files
    },
  }
})

// Reset filesystem before each test
beforeEach(() => {
  vol.reset()
})

// Mock process.cwd to return a consistent test directory
const originalCwd = process.cwd
beforeAll(() => {
  process.cwd = vi.fn(() => '/test-project')
})

afterAll(() => {
  process.cwd = originalCwd
})

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
}
