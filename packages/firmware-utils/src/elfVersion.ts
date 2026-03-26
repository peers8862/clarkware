/**
 * elfVersion — extract firmware version string from an ELF binary.
 *
 * Strategy (Phase 1): invoke arm-none-eabi-readelf as a subprocess and search
 * for a known symbol (__clark_firmware_version) in the symbol table.
 * Falls back to scanning .rodata string dump for a semver-like pattern.
 *
 * Requires arm-none-eabi-readelf on PATH (part of the ARM GNU toolchain).
 * Returns null if the toolchain is not available or no version is found —
 * callers must treat a null version as acceptable (not all firmware embeds one).
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const KNOWN_SYMBOL = '__clark_firmware_version';
const SEMVER_RE = /\b(\d+\.\d+\.\d+(?:-[\w.]+)?)\b/;

export async function extractFirmwareVersion(elfPath: string): Promise<string | null> {
  // 1. Try the known Clark firmware version symbol first
  try {
    const { stdout } = await execFileAsync('arm-none-eabi-nm', ['--defined-only', elfPath]);
    const line = stdout.split('\n').find((l) => l.includes(KNOWN_SYMBOL));
    if (line) {
      // Symbol found — read the string value from .rodata at that address via readelf
      const addrMatch = /^([0-9a-f]+)\s/i.exec(line.trim());
      if (addrMatch) return `sym:${addrMatch[1]}`; // address placeholder — full extraction is Phase 2
    }
  } catch {
    // arm-none-eabi-nm not available or symbol not present — fall through
  }

  // 2. Scan .rodata string dump for a semver-like pattern
  try {
    const { stdout } = await execFileAsync('arm-none-eabi-readelf', ['--string-dump=.rodata', elfPath]);
    for (const line of stdout.split('\n')) {
      const m = SEMVER_RE.exec(line);
      if (m) return m[1];
    }
  } catch {
    // Toolchain not available
  }

  return null;
}
