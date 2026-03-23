const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function streamToBytes(readable: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  let total = 0;
  for (const c of chunks) total += c.length;
  const result = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    result.set(c, offset);
    offset += c.length;
  }
  return result;
}

function pipeThrough(data: Uint8Array, stream: { writable: WritableStream; readable: ReadableStream<Uint8Array> }): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  writer.write(data.buffer as ArrayBuffer);
  writer.close();
  return streamToBytes(stream.readable);
}

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(data, new CompressionStream("gzip"));
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  return pipeThrough(data, new DecompressionStream("gzip"));
}

export async function encrypt(
  plaintext: string,
  password: string,
): Promise<{ salt: string; iv: string; data: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);

  const enc = new TextEncoder();
  const compressed = await gzip(enc.encode(plaintext));

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
    key,
    compressed.buffer as ArrayBuffer,
  );

  return {
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(ciphertext),
  };
}

export async function decrypt(
  salt: string,
  iv: string,
  data: string,
  password: string,
): Promise<string> {
  const saltBuf = fromBase64(salt);
  const ivBuf = fromBase64(iv);
  const ciphertext = fromBase64(data);

  const key = await deriveKey(password, saltBuf);

  const compressed = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBuf.buffer as ArrayBuffer },
    key,
    ciphertext.buffer as ArrayBuffer,
  );

  const decompressed = await gunzip(new Uint8Array(compressed));
  return new TextDecoder().decode(decompressed);
}
