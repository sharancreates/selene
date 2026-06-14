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
