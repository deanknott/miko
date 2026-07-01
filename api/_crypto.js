import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

function getKey() {
  return createHash('sha256').update(`${process.env.SESSION_SECRET}:ai-key-encryption`).digest()
}

export function encryptSecret(plaintext) {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv, ciphertext, authTag].map(b => b.toString('base64')).join('.')
}

export function decryptSecret(encoded) {
  const [ivB64, ciphertextB64, authTagB64] = encoded.split('.')
  const key = getKey()
  const iv = Buffer.from(ivB64, 'base64')
  const ciphertext = Buffer.from(ciphertextB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()])
  return plaintext.toString('utf8')
}
