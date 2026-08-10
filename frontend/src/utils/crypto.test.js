import { describe, it, expect, beforeAll } from 'vitest';
import { deriveKeyFromPin, encryptData, decryptData } from './crypto';

// Polyfill window.crypto if running in Node environment
beforeAll(() => {
  if (typeof window === 'undefined') {
    globalThis.window = globalThis;
  }
  if (!window.crypto && globalThis.crypto) {
    window.crypto = globalThis.crypto;
  }
});

describe('Selene Client Cryptographic Module (crypto.js)', () => {
  const samplePin = "123456";
  const sampleUsername = "testuser";

  it('should deterministically derive a URL-safe base64 key using PBKDF2', async () => {
    const key1 = await deriveKeyFromPin(samplePin, sampleUsername);
    const key2 = await deriveKeyFromPin(samplePin, sampleUsername);

    expect(key1).toBeDefined();
    expect(typeof key1).toBe('string');
    expect(key1.length).toBeGreaterThan(20);
    // Key derivation must be deterministic for identical PIN and username
    expect(key1).toEqual(key2);

    // Derived key must not contain raw standard base64 symbols '+' or '/'
    expect(key1).not.toContain('+');
    expect(key1).not.toContain('/');
  });

  it('should produce different derived keys for different users or PINs', async () => {
    const keyUserA = await deriveKeyFromPin("123456", "userA");
    const keyUserB = await deriveKeyFromPin("123456", "userB");
    const keyDifferentPin = await deriveKeyFromPin("654321", "userA");

    expect(keyUserA).not.toEqual(keyUserB);
    expect(keyUserA).not.toEqual(keyDifferentPin);
  });

  it('should successfully encrypt and decrypt string data via AES-GCM (roundtrip)', async () => {
    const key = await deriveKeyFromPin(samplePin, sampleUsername);
    const plaintext = JSON.stringify({
      flow_intensity: 75,
      pelvic_pain: 30,
      phase: "menstrual",
      symptom_tags: { cramps: true, fatigue: true }
    });

    const ciphertext = await encryptData(plaintext, key);
    expect(ciphertext).toBeDefined();
    expect(ciphertext).not.toEqual(plaintext);

    const decrypted = await decryptData(ciphertext, key);
    expect(decrypted).toEqual(plaintext);
    
    const parsed = JSON.parse(decrypted);
    expect(parsed.phase).toBe("menstrual");
    expect(parsed.flow_intensity).toBe(75);
  });

  it('should fail to decrypt ciphertext when an incorrect key is provided', async () => {
    const correctKey = await deriveKeyFromPin(samplePin, sampleUsername);
    const wrongKey = await deriveKeyFromPin("999999", sampleUsername);
    
    const plaintext = "Sensitive health indicator";
    const ciphertext = await encryptData(plaintext, correctKey);

    await expect(decryptData(ciphertext, wrongKey)).rejects.toThrow();
  });

  it('should throw an error when attempting to encrypt or decrypt without a key', async () => {
    await expect(encryptData("data", null)).rejects.toThrow("Encryption key is required");
    await expect(decryptData("ciphertext", null)).rejects.toThrow("Decryption key is required");
  });
});
