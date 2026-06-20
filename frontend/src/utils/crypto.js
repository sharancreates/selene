/**
 * Derives a 32-byte encryption key from a user's PIN and username using PBKDF2.
 * The derived key is formatted as a URL-safe base64 string suitable for Fernet encryption.
 * @param {string} pin 
 * @param {string} username 
 * @returns {Promise<string>}
 */
export async function deriveKeyFromPin(pin, username) {
  const encoder = new TextEncoder();
  const pinBytes = encoder.encode(pin);
  const saltBytes = encoder.encode(username + "selene-salt-suffix");
  
  const baseKey = await window.crypto.subtle.importKey(
    "raw",
    pinBytes,
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    256
  );
  
  const bytes = new Uint8Array(derivedBits);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  // Transform to urlsafe base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Encrypts plaintext string using AES-GCM with a base64-encoded key.
 * @param {string} plaintext
 * @param {string} keyB64 - base64-encoded AES key (kek_pin)
 * @returns {Promise<string>} - Concatenated IV + Ciphertext in base64
 */
export async function encryptData(plaintext, keyB64) {
  if (!keyB64) throw new Error("Encryption key is required");
  
  const normalizedKey = keyB64.replace(/-/g, '+').replace(/_/g, '/');
  const rawKey = new Uint8Array(
    atob(normalizedKey)
      .split('')
      .map(c => c.charCodeAt(0))
  );

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    encoder.encode(plaintext)
  );

  const combined = new Uint8Array(iv.byteLength + ciphertextBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertextBuffer), iv.byteLength);

  let binary = '';
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

/**
 * Decrypts ciphertext using AES-GCM with a base64-encoded key.
 * @param {string} ciphertextB64 - base64-encoded IV + Ciphertext
 * @param {string} keyB64 - base64-encoded AES key (kek_pin)
 * @returns {Promise<string>} - Decrypted plaintext string
 */
export async function decryptData(ciphertextB64, keyB64) {
  if (!keyB64) throw new Error("Decryption key is required");
  if (!ciphertextB64) return "";

  const normalizedKey = keyB64.replace(/-/g, '+').replace(/_/g, '/');
  const rawKey = new Uint8Array(
    atob(normalizedKey)
      .split('')
      .map(c => c.charCodeAt(0))
  );

  const cryptoKey = await window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const binary = atob(ciphertextB64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }

  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    cryptoKey,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}
