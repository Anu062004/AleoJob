// Encryption Utilities (client-side)

export async function encryptFile(file: File | Blob, password?: string): Promise<Blob> {
  const data = await file.arrayBuffer();
  const key = await deriveKey(password || 'default-password');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedData = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);

  const result = new Uint8Array(iv.length + encryptedData.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedData), iv.length);
  return new Blob([result], { type: 'application/octet-stream' });
}

export async function decryptFile(encryptedBlob: Blob, password?: string): Promise<Blob> {
  const data = await encryptedBlob.arrayBuffer();
  const key = await deriveKey(password || 'default-password');
  const iv = new Uint8Array(data.slice(0, 12));
  const encryptedData = data.slice(12);
  const decryptedData = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedData);
  return new Blob([decryptedData]);
}

async function deriveKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);
  const keyMaterial = await crypto.subtle.importKey('raw', passwordData, 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('aleojob-salt'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}


