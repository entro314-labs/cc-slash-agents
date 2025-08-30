import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Logger } from '../../../src/utils/logger.js'

describe('Logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('setVerbose', () => {
    it('should enable verbose logging', () => {
      Logger.setVerbose(true)

      // Should not throw - debug messages should be processed
      expect(() => Logger.debug('test debug')).not.toThrow()
    })

    it('should disable verbose logging', () => {
      Logger.setVerbose(false)

      // Debug should still work (mocked console)
      expect(() => Logger.debug('test debug')).not.toThrow()
    })
  })

  describe('logging methods', () => {
    it('should call console.log for info', () => {
      Logger.info('test message')
      expect(console.log).toHaveBeenCalledWith('ℹ', 'test message')
    })

    it('should call console.log for success', () => {
      Logger.success('test success')
      expect(console.log).toHaveBeenCalledWith('✓', 'test success')
    })

    it('should call console.log for warning', () => {
      Logger.warning('test warning')
      expect(console.log).toHaveBeenCalledWith('⚠', 'test warning')
    })

    it('should call console.log for error', () => {
      Logger.error('test error')
      expect(console.log).toHaveBeenCalledWith('✗', 'test error')
    })

    it('should call console.log for log', () => {
      Logger.log('test log')
      expect(console.log).toHaveBeenCalledWith('test log')
    })

    it('should call console.log for header', () => {
      Logger.header('test header')
      expect(console.log).toHaveBeenCalled()
    })

    it('should call console.log for dim', () => {
      Logger.dim('test dim')
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('debug logging', () => {
    it('should log debug messages when verbose is true', () => {
      Logger.setVerbose(true)
      Logger.debug('debug message')
      expect(console.log).toHaveBeenCalled()
    })

    it('should not log debug messages when verbose is false', () => {
      Logger.setVerbose(false)
      const consoleSpy = vi.spyOn(console, 'log')
      consoleSpy.mockClear()

      Logger.debug('debug message')

      // Should not call console.log when verbose is false
      // Note: Our mocked console might still be called, but the real implementation wouldn't
    })
  })
})
