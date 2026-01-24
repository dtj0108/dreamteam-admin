import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { encryptApiKey, decryptApiKey } from '@/lib/encryption'

describe('encryption', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    // Set a valid 64-character hex encryption key (32 bytes)
    process.env = {
      ...originalEnv,
      ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encryptApiKey', () => {
    it('returns correct format iv:authTag:ciphertext', () => {
      const encrypted = encryptApiKey('test-api-key')

      const parts = encrypted.split(':')
      expect(parts).toHaveLength(3)

      // Each part should be base64 encoded
      parts.forEach(part => {
        expect(() => Buffer.from(part, 'base64')).not.toThrow()
      })
    })

    it('produces different ciphertext each time (unique IV)', () => {
      const plaintext = 'test-api-key'
      const encrypted1 = encryptApiKey(plaintext)
      const encrypted2 = encryptApiKey(plaintext)

      // IVs should be different
      expect(encrypted1).not.toBe(encrypted2)

      // But both should decrypt to same value
      expect(decryptApiKey(encrypted1)).toBe(plaintext)
      expect(decryptApiKey(encrypted2)).toBe(plaintext)
    })

    it('handles empty string', () => {
      const encrypted = encryptApiKey('')
      const decrypted = decryptApiKey(encrypted)
      expect(decrypted).toBe('')
    })

    it('handles long strings', () => {
      const longString = 'a'.repeat(10000)
      const encrypted = encryptApiKey(longString)
      const decrypted = decryptApiKey(encrypted)
      expect(decrypted).toBe(longString)
    })

    it('handles special characters', () => {
      const special = '!@#$%^&*()_+-=[]{}|;:,.<>?/~`"\' unicode: \u0000\u001F\u007F 中文 🔐'
      const encrypted = encryptApiKey(special)
      const decrypted = decryptApiKey(encrypted)
      expect(decrypted).toBe(special)
    })
  })

  describe('decryptApiKey', () => {
    it('roundtrip encrypt then decrypt returns original', () => {
      const testValues = [
        'sk-ant-api03-xxxx',
        'simple-key',
        'key-with-special-chars-!@#$%',
        '',
        'very long key '.repeat(100),
      ]

      for (const plaintext of testValues) {
        const encrypted = encryptApiKey(plaintext)
        const decrypted = decryptApiKey(encrypted)
        expect(decrypted).toBe(plaintext)
      }
    })

    it('throws on tampered ciphertext', () => {
      const encrypted = encryptApiKey('test-api-key')
      const parts = encrypted.split(':')

      // Tamper with the ciphertext
      const tamperedCiphertext = Buffer.from(parts[2], 'base64')
      tamperedCiphertext[0] = (tamperedCiphertext[0] + 1) % 256
      parts[2] = tamperedCiphertext.toString('base64')

      expect(() => decryptApiKey(parts.join(':'))).toThrow()
    })

    it('throws on tampered auth tag', () => {
      const encrypted = encryptApiKey('test-api-key')
      const parts = encrypted.split(':')

      // Tamper with the auth tag
      const tamperedAuthTag = Buffer.from(parts[1], 'base64')
      tamperedAuthTag[0] = (tamperedAuthTag[0] + 1) % 256
      parts[1] = tamperedAuthTag.toString('base64')

      expect(() => decryptApiKey(parts.join(':'))).toThrow()
    })

    it('throws on invalid format - missing parts', () => {
      expect(() => decryptApiKey('onlyonepart')).toThrow('Invalid encrypted format')
      expect(() => decryptApiKey('two:parts')).toThrow('Invalid encrypted format')
    })

    it('throws on invalid format - too many parts', () => {
      expect(() => decryptApiKey('a:b:c:d')).toThrow('Invalid encrypted format')
    })

    it('throws on invalid IV length', () => {
      // IV should be 12 bytes (96 bits)
      const shortIv = Buffer.alloc(6).toString('base64')
      const authTag = Buffer.alloc(16).toString('base64')
      const ciphertext = Buffer.from('test').toString('base64')

      expect(() => decryptApiKey(`${shortIv}:${authTag}:${ciphertext}`)).toThrow('Invalid IV length')
    })

    it('throws on invalid auth tag length', () => {
      // Auth tag should be 16 bytes (128 bits)
      const iv = Buffer.alloc(12).toString('base64')
      const shortAuthTag = Buffer.alloc(8).toString('base64')
      const ciphertext = Buffer.from('test').toString('base64')

      expect(() => decryptApiKey(`${iv}:${shortAuthTag}:${ciphertext}`)).toThrow('Invalid auth tag length')
    })
  })

  describe('getEncryptionKey', () => {
    it('throws when ENCRYPTION_KEY env var is not set', async () => {
      delete process.env.ENCRYPTION_KEY

      // Re-import to pick up new env
      vi.resetModules()
      const { encryptApiKey: freshEncrypt } = await import('@/lib/encryption')

      expect(() => freshEncrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set')
    })

    it('throws when ENCRYPTION_KEY is wrong length', async () => {
      process.env.ENCRYPTION_KEY = 'tooshort'

      vi.resetModules()
      const { encryptApiKey: freshEncrypt } = await import('@/lib/encryption')

      expect(() => freshEncrypt('test')).toThrow('ENCRYPTION_KEY must be a 64 character hex string')
    })

    it('accepts valid 64-character hex key', () => {
      // This should not throw with the key set in beforeEach
      expect(() => encryptApiKey('test')).not.toThrow()
    })
  })
})
