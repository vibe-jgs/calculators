/**
 * Ephemeral Session Encryption for Web Storage
 * Uses AES-GCM with a key stored only in sessionStorage.
 */

const KEY_NAME = 'swc-ephemeral-key';

async function getOrGenerateKey() {
  const existingKeyJwk = sessionStorage.getItem(KEY_NAME);
  if (existingKeyJwk) {
    try {
      const jwk = JSON.parse(existingKeyJwk);
      return await window.crypto.subtle.importKey(
        'jwk', jwk, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']
      );
    } catch (e) {
      console.warn("Failed to load ephemeral key, generating a new one.");
    }
  }

  // Generate new key
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  // Store in sessionStorage
  const jwk = await window.crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(KEY_NAME, JSON.stringify(jwk));
  return key;
}

/**
 * Encrypts a JSON serializable object and returns an object with IV and ciphertext Base64 strings.
 */
async function encryptState(stateObj) {
  try {
    const key = await getOrGenerateKey();
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(stateObj));
    
    const ciphertext = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encoded
    );

    // Convert ArrayBuffer to Base64
    return {
      iv: btoa(String.fromCharCode(...iv)),
      data: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
    };
  } catch (e) {
    console.error("Encryption failed", e);
    return null;
  }
}

/**
 * Decrypts an object containing IV and ciphertext Base64 strings.
 */
async function decryptState(encryptedObj) {
  if (!encryptedObj || !encryptedObj.iv || !encryptedObj.data) return null;
  try {
    const key = await getOrGenerateKey();
    const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
    const ciphertext = Uint8Array.from(atob(encryptedObj.data), c => c.charCodeAt(0));
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );
    
    const decoded = new TextDecoder().decode(decrypted);
    return JSON.parse(decoded);
  } catch (e) {
    console.warn("Decryption failed (Likely a new session or corrupted data).");
    return null;
  }
}
