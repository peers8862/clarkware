/**
 * probeList — known JTAG/SWD probe VID/PID table.
 * Used by the backend service to identify connected probes by USB descriptor.
 * Source: ADR-002, firmware-toolchain-integration.md
 */

export interface ProbeDescriptor {
  vid: number;
  pid: number | null; // null = match any PID for this vendor
  name: string;
  type: 'jlink' | 'stlink' | 'cmsis-dap' | 'blackmagic';
  /** GDB server to use when this probe is detected */
  gdbServer: 'jlink' | 'openocd';
}

export const KNOWN_PROBES: ProbeDescriptor[] = [
  // SEGGER J-Link family — use J-Link GDB Server (ADR-002)
  { vid: 0x1366, pid: 0x0101, name: 'J-Link',           type: 'jlink',    gdbServer: 'jlink' },
  { vid: 0x1366, pid: 0x0105, name: 'J-Link (v2)',       type: 'jlink',    gdbServer: 'jlink' },
  { vid: 0x1366, pid: 0x1015, name: 'J-Link BASE',       type: 'jlink',    gdbServer: 'jlink' },
  { vid: 0x1366, pid: 0x1051, name: 'J-Link PLUS',       type: 'jlink',    gdbServer: 'jlink' },
  // ST-Link — use OpenOCD with stlink driver
  { vid: 0x0483, pid: 0x3748, name: 'ST-Link v2',        type: 'stlink',   gdbServer: 'openocd' },
  { vid: 0x0483, pid: 0x374b, name: 'ST-Link v2-1',      type: 'stlink',   gdbServer: 'openocd' },
  { vid: 0x0483, pid: 0x374e, name: 'ST-Link v3',        type: 'stlink',   gdbServer: 'openocd' },
  { vid: 0x0483, pid: 0x374f, name: 'ST-Link v3E',       type: 'stlink',   gdbServer: 'openocd' },
  // CMSIS-DAP (generic HID) — use OpenOCD with cmsis-dap driver
  { vid: 0x0d28, pid: 0x0204, name: 'DAPLink (Mbed)',    type: 'cmsis-dap', gdbServer: 'openocd' },
  { vid: 0x1fc9, pid: 0x0143, name: 'LPC-Link2 CMSIS',  type: 'cmsis-dap', gdbServer: 'openocd' },
  // Black Magic Probe — native GDB serial, no GDB server needed (Phase 2)
  { vid: 0x1d50, pid: 0x6018, name: 'Black Magic Probe', type: 'blackmagic', gdbServer: 'openocd' },
];

export function identifyProbe(vid: number, pid: number): ProbeDescriptor | undefined {
  return KNOWN_PROBES.find((p) => p.vid === vid && (p.pid === null || p.pid === pid));
}
