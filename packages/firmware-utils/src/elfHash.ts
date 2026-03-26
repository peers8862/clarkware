/**
 * elfHash — SHA-256 of an ELF binary file.
 * Uses Node.js crypto streams — no external toolchain dependency.
 */
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

export function hashElf(elfPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(elfPath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}
