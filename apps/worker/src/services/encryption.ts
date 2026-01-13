/**
 * AES-GCM Encryption Service
 * Used to securely store GitHub access tokens in the database
 */

export interface EncryptedData {
  encrypted: string;
  iv: string;
}

/**
 * Encrypts a string using AES-GCM
 * @param plaintext - The string to encrypt
 * @param keyBase64 - Base64-encoded 256-bit key
 * @returns Encrypted data with IV
 */
export async function encrypt(
  plaintext: string,
  keyBase64: string,
): Promise<EncryptedData> {
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encoded,
  );

  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

/**
 * Decrypts AES-GCM encrypted data
 * @param encrypted - Base64-encoded encrypted data
 * @param ivBase64 - Base64-encoded initialization vector
 * @param keyBase64 - Base64-encoded 256-bit key
 * @returns Decrypted string
 */
export async function decrypt(
  encrypted: string,
  ivBase64: string,
  keyBase64: string,
): Promise<string> {
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBuffer,
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );

  const iv = Uint8Array.from(atob(ivBase64), (c) => c.charCodeAt(0));
  const encryptedBuffer = Uint8Array.from(atob(encrypted), (c) =>
    c.charCodeAt(0),
  );

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encryptedBuffer,
  );

  return new TextDecoder().decode(decryptedBuffer);
}

/**
 * Generates a random 256-bit key for AES-GCM
 * @returns Base64-encoded key
 */
export function generateEncryptionKey(): string {
  const key = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...key));
}
