import { describe, it, expect } from 'vitest'
import { encryptSecret, decryptSecret } from '../api/_crypto.js'

describe('API key encryption', () => {
  it('decrypts back to the original value', () => {
    expect(decryptSecret(encryptSecret('sk-test-123'))).toBe('sk-test-123')
  })

  it('does not contain the plain text key', () => {
    const encrypted = encryptSecret('sk-test-123')
    expect(encrypted).not.toContain('sk-test-123')
    expect(encrypted.split('.')).toHaveLength(3)
  })

  it('uses a fresh IV, so the same key encrypts differently each time', () => {
    expect(encryptSecret('sk-test-123')).not.toBe(encryptSecret('sk-test-123'))
  })

  it('refuses to decrypt a tampered value', () => {
    const [iv, ciphertext, authTag] = encryptSecret('sk-test-123').split('.')
    const bytes = Buffer.from(ciphertext, 'base64')
    bytes[0] ^= 0xff
    const tampered = [iv, bytes.toString('base64'), authTag].join('.')
    expect(() => decryptSecret(tampered)).toThrow()
  })
})
