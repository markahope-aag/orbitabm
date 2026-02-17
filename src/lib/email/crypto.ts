/**
 * Encryption helpers for storing sensitive credentials in the database.
 * Uses AES-256-GCM via Node.js crypto module. The key comes from
 * the EMAIL_ENCRYPTION_KEY env var (64-char hex = 32 bytes).
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.EMAIL_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('EMAIL_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Encrypt a plaintext string. Returns base64-encoded `iv:ciphertext:tag`.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${tag.toString('base64')}`
}

/**
 * Decrypt a string produced by `encrypt()`.
 */
export function decrypt(ciphertext: string): string {
  const key = getKey()
  const [ivB64, encB64, tagB64] = ciphertext.split(':')
  if (!ivB64 || !encB64 || !tagB64) {
    throw new Error('Invalid encrypted value format')
  }
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encB64, 'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)
  return decipher.update(encrypted) + decipher.final('utf8')
}
