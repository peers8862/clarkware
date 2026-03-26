import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import {
  fetchRecords, createRecord, recordFlashResult, hashElfFile,
  FLASH_STATUS_LABELS,
} from './firmware-api';
import type { FirmwareRecord } from './firmware-api';

export const FIRMWARE_WIDGET_ID = 'clark-firmware';

// ── State ─────────────────────────────────────────────────────────────────────

interface State {
  jobId: string | null;
  jobTitle: string | null;
  facilityId: string | null;
  workstationId: string | null;

  records: FirmwareRecord[];
  loading: boolean;
  error: string | null;

  // New flash form
  showForm: boolean;
  formElf: File | null;
  formHash: string;
  formVersion: string;
  formTargetMcu: string;
  formProgrammerSerial: string;
  formHashing: boolean;
  formSubmitting: boolean;
  formError: string | null;

  // Result recording
  activeRecordId: string | null;
  resultStatus: 'success' | 'failed';
  resultCrc: boolean;
  resultDurationMs: string;
  resultError: string;
  submittingResult: boolean;
  resultFormError: string | null;
}

const INITIAL_STATE: State = {
  jobId: null, jobTitle: null, facilityId: null, workstationId: null,
  records: [], loading: false, error: null,
  showForm: false, formElf: null, formHash: '', formVersion: '',
  formTargetMcu: '', formProgrammerSerial: '',
  formHashing: false, formSubmitting: false, formError: null,
  activeRecordId: null, resultStatus: 'success', resultCrc: true,
  resultDurationMs: '', resultError: '', submittingResult: false, resultFormError: null,
};

// ── Widget ────────────────────────────────────────────────────────────────────

@injectable()
export class FirmwareWidget extends ReactWidget {
  static readonly ID = FIRMWARE_WIDGET_ID;
  static readonly LABEL = 'Firmware';

  private state: State = { ...INITIAL_STATE };

  constructor() {
    super();
    this.id = FIRMWARE_WIDGET_ID;
    this.title.label = FirmwareWidget.LABEL;
    this.title.closable = false;
    this.update();

    window.addEventListener('clark:job-selected', (e) => {
      const { jobId, jobTitle, facilityId, workstationId } =
        (e as CustomEvent<{ jobId: string; jobTitle: string; facilityId?: string; workstationId?: string }>).detail;
      void this.loadJob(jobId, jobTitle, facilityId ?? null, workstationId ?? null);
    });
  }

  // ── Data loading ──────────────────────────────────────────────────────────

  private async loadJob(jobId: string, jobTitle: string, facilityId: string | null, workstationId: string | null): Promise<void> {
    this.state = { ...INITIAL_STATE, jobId, jobTitle, facilityId, workstationId, loading: true };
    this.update();
    try {
      const records = await fetchRecords(jobId);
      this.state = { ...this.state, records, loading: false };
    } catch (e) {
      this.state = { ...this.state, loading: false, error: String(e) };
    }
    this.update();
  }

  private async reload(): Promise<void> {
    if (!this.state.jobId) return;
    try {
      const records = await fetchRecords(this.state.jobId);
      this.state = { ...this.state, records };
      this.update();
    } catch { /* non-critical */ }
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private async handleFileChange(file: File): Promise<void> {
    this.state = { ...this.state, formElf: file, formHash: '', formHashing: true, formError: null };
    this.update();
    try {
      const hash = await hashElfFile(file);
      this.state = { ...this.state, formHash: hash, formHashing: false };
    } catch (e) {
      this.state = { ...this.state, formHashing: false, formError: `Hash failed: ${String(e)}` };
    }
    this.update();
  }

  private async handleCreateRecord(): Promise<void> {
    const { jobId, facilityId, workstationId, formElf, formHash, formVersion, formTargetMcu, formProgrammerSerial } = this.state;
    if (!jobId || !facilityId || !workstationId) return;
    if (!formElf || !formHash) { this.state = { ...this.state, formError: 'Select an ELF file first.' }; this.update(); return; }
    if (!formTargetMcu.trim()) { this.state = { ...this.state, formError: 'Target MCU is required.' }; this.update(); return; }

    this.state = { ...this.state, formSubmitting: true, formError: null };
    this.update();
    try {
      await createRecord({
        jobId, facilityId, workstationId,
        elfFilename: formElf.name,
        binaryHash: formHash,
        firmwareVersion: formVersion.trim() || undefined,
        targetMcu: formTargetMcu.trim(),
        programmerSerial: formProgrammerSerial.trim() || undefined,
      });
      this.state = { ...this.state, showForm: false, formSubmitting: false };
      this.update();
      await this.reload();
    } catch (e) {
      this.state = { ...this.state, formSubmitting: false, formError: String(e) };
      this.update();
    }
  }

  private async handleRecordResult(): Promise<void> {
    const { activeRecordId, jobId, facilityId, workstationId, resultStatus, resultCrc, resultDurationMs, resultError } = this.state;
    if (!activeRecordId || !jobId || !facilityId || !workstationId) return;
    const durationMs = parseInt(resultDurationMs, 10);
    if (isNaN(durationMs) || durationMs < 0) { this.state = { ...this.state, resultFormError: 'Duration must be a non-negative integer (ms).' }; this.update(); return; }

    this.state = { ...this.state, submittingResult: true, resultFormError: null };
    this.update();
    try {
      await recordFlashResult({
        recordId: activeRecordId, jobId, facilityId, workstationId,
        flashStatus: resultStatus, crcVerified: resultCrc,
        flashDurationMs: durationMs,
        errorMessage: resultError.trim() || undefined,
      });
      this.state = { ...this.state, activeRecordId: null, submittingResult: false };
      this.update();
      await this.reload();
    } catch (e) {
      this.state = { ...this.state, submittingResult: false, resultFormError: String(e) };
      this.update();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  protected render(): React.ReactNode {
    const { jobId, jobTitle, loading, error } = this.state;
    return (
      <div style={container}>
        <div style={header}>
          <span style={headerLabel}>Firmware</span>
          {jobTitle && <span style={headerJob}>{jobTitle}</span>}
        </div>

        {error && (
          <div style={errorBanner} onClick={() => { this.state = { ...this.state, error: null }; this.update(); }}>
            {error} ✕
          </div>
        )}

        {!jobId && <p style={muted}>Select a job to view firmware records.</p>}
        {jobId && loading && <p style={muted}>Loading…</p>}
        {jobId && !loading && this.renderContent()}
      </div>
    );
  }

  private renderContent(): React.ReactNode {
    const { facilityId, showForm, activeRecordId } = this.state;
    return (
      <>
        {!facilityId && (
          <div style={warnBanner}>Job context unavailable — re-select the job from the jobs panel.</div>
        )}

        <div style={toolbar}>
          <button
            style={primaryBtn}
            disabled={showForm || !!activeRecordId || !facilityId}
            onClick={() => { this.state = { ...this.state, showForm: true, formError: null }; this.update(); }}
          >
            + New Flash Record
          </button>
        </div>

        {showForm && this.renderNewRecordForm()}
        {activeRecordId && this.renderResultForm()}
        {this.renderRecordList()}
      </>
    );
  }

  // ── New record form ───────────────────────────────────────────────────────

  private renderNewRecordForm(): React.ReactNode {
    const { formElf, formHash, formHashing, formVersion, formTargetMcu, formProgrammerSerial, formSubmitting, formError } = this.state;
    return (
      <div style={formCard}>
        <div style={formTitle}>New Firmware Flash Record</div>
        {formError && <div style={errorInline}>{formError}</div>}

        <label style={labelStyle}>ELF binary</label>
        <input
          type="file"
          accept=".elf"
          style={fileInput}
          disabled={formSubmitting}
          onChange={(e) => {
            const f = (e.target as HTMLInputElement).files?.[0];
            if (f) void this.handleFileChange(f);
          }}
        />
        {formHashing && <div style={hashLine}>Computing SHA-256…</div>}
        {formHash && <div style={hashLine}>SHA-256: <code style={hashCode}>{formHash.slice(0, 16)}…</code></div>}

        <label style={labelStyle}>Target MCU <span style={required}>*</span></label>
        <input
          style={inputStyle}
          placeholder="e.g. STM32F407VGT6"
          value={formTargetMcu}
          disabled={formSubmitting}
          onChange={(e) => { this.state = { ...this.state, formTargetMcu: (e.target as HTMLInputElement).value }; this.update(); }}
        />

        <label style={labelStyle}>Firmware version</label>
        <input
          style={inputStyle}
          placeholder="e.g. 1.2.3 (optional)"
          value={formVersion}
          disabled={formSubmitting}
          onChange={(e) => { this.state = { ...this.state, formVersion: (e.target as HTMLInputElement).value }; this.update(); }}
        />

        <label style={labelStyle}>Programmer serial</label>
        <input
          style={inputStyle}
          placeholder="Probe serial number (optional)"
          value={formProgrammerSerial}
          disabled={formSubmitting}
          onChange={(e) => { this.state = { ...this.state, formProgrammerSerial: (e.target as HTMLInputElement).value }; this.update(); }}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button style={primaryBtn} disabled={formSubmitting || formHashing || !formHash} onClick={() => void this.handleCreateRecord()}>
            {formSubmitting ? 'Saving…' : 'Create Record'}
          </button>
          <button style={smallBtn} disabled={formSubmitting} onClick={() => { this.state = { ...this.state, showForm: false }; this.update(); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Result form ───────────────────────────────────────────────────────────

  private renderResultForm(): React.ReactNode {
    const { resultStatus, resultCrc, resultDurationMs, resultError, submittingResult, resultFormError } = this.state;
    return (
      <div style={formCard}>
        <div style={formTitle}>Record Flash Result</div>
        {resultFormError && <div style={errorInline}>{resultFormError}</div>}

        <label style={labelStyle}>Flash status</label>
        <select
          style={selectStyle}
          value={resultStatus}
          disabled={submittingResult}
          onChange={(e) => { this.state = { ...this.state, resultStatus: (e.target as HTMLSelectElement).value as 'success' | 'failed' }; this.update(); }}
        >
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>

        <label style={labelStyle}>CRC verified</label>
        <select
          style={selectStyle}
          value={resultCrc ? 'yes' : 'no'}
          disabled={submittingResult}
          onChange={(e) => { this.state = { ...this.state, resultCrc: (e.target as HTMLSelectElement).value === 'yes' }; this.update(); }}
        >
          <option value="yes">Yes</option>
          <option value="no">No</option>
        </select>

        <label style={labelStyle}>Flash duration (ms) <span style={required}>*</span></label>
        <input
          style={inputStyle}
          type="number"
          min="0"
          placeholder="e.g. 3200"
          value={resultDurationMs}
          disabled={submittingResult}
          onChange={(e) => { this.state = { ...this.state, resultDurationMs: (e.target as HTMLInputElement).value }; this.update(); }}
        />

        {resultStatus === 'failed' && (
          <>
            <label style={labelStyle}>Error message</label>
            <input
              style={inputStyle}
              placeholder="Describe the failure"
              value={resultError}
              disabled={submittingResult}
              onChange={(e) => { this.state = { ...this.state, resultError: (e.target as HTMLInputElement).value }; this.update(); }}
            />
          </>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button style={primaryBtn} disabled={submittingResult} onClick={() => void this.handleRecordResult()}>
            {submittingResult ? 'Saving…' : 'Save Result'}
          </button>
          <button style={smallBtn} disabled={submittingResult} onClick={() => { this.state = { ...this.state, activeRecordId: null }; this.update(); }}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ── Record list ───────────────────────────────────────────────────────────

  private renderRecordList(): React.ReactNode {
    const { records } = this.state;
    if (records.length === 0) return <p style={muted}>No firmware records for this job.</p>;
    return (
      <div style={recordList}>
        {records.map((r) => this.renderRecord(r))}
      </div>
    );
  }

  private renderRecord(r: FirmwareRecord): React.ReactNode {
    const isPending = r.flashStatus === 'pending';
    return (
      <div key={r.id} style={recordCard(r.flashStatus)}>
        <div style={recordHeader}>
          <span style={recordFilename}>{r.elfFilename}</span>
          <span style={statusBadge(r.flashStatus)}>{FLASH_STATUS_LABELS[r.flashStatus]}</span>
        </div>
        <div style={recordMeta}>
          MCU: {r.targetMcu}
          {r.firmwareVersion && ` · v${r.firmwareVersion}`}
          {r.programmerSerial && ` · Probe: ${r.programmerSerial}`}
        </div>
        <div style={recordHash}>
          SHA-256: <code style={hashCode}>{r.binaryHash.slice(0, 16)}…</code>
        </div>
        {r.flashStatus === 'success' && (
          <div style={recordResult}>
            CRC: {r.crcVerified ? '✓ verified' : '✗ not verified'} · {r.flashDurationMs}ms
          </div>
        )}
        {r.flashStatus === 'failed' && r.errorMessage && (
          <div style={recordError}>{r.errorMessage}</div>
        )}
        {isPending && (
          <button
            style={smallBtn}
            onClick={() => { this.state = { ...this.state, activeRecordId: r.id, resultDurationMs: '', resultError: '', resultFormError: null }; this.update(); }}
          >
            Record Result
          </button>
        )}
      </div>
    );
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────

const container: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: '100%',
  padding: '10px 14px', overflowY: 'auto',
  fontFamily: 'var(--theia-ui-font-family)',
};

const header: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px',
};

const headerLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)',
};

const headerJob: React.CSSProperties = {
  fontSize: '12px', color: 'var(--theia-foreground)', fontWeight: 500,
};

const errorBanner: React.CSSProperties = {
  padding: '6px 10px', marginBottom: '8px', fontSize: '11px', cursor: 'pointer',
  background: 'var(--theia-inputValidation-errorBackground)',
  color: 'var(--theia-errorForeground)',
  border: '1px solid var(--theia-inputValidation-errorBorder)',
  borderRadius: '3px',
};

const warnBanner: React.CSSProperties = {
  padding: '6px 10px', marginBottom: '8px', fontSize: '11px',
  background: 'var(--theia-inputValidation-warningBackground)',
  color: 'var(--theia-foreground)',
  border: '1px solid var(--theia-inputValidation-warningBorder)',
  borderRadius: '3px',
};

const errorInline: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theia-errorForeground)', marginBottom: '6px',
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: '0 0 8px 0',
};

const toolbar: React.CSSProperties = {
  display: 'flex', gap: '6px', marginBottom: '10px',
};

const formCard: React.CSSProperties = {
  padding: '12px', marginBottom: '10px',
  background: 'var(--theia-editor-background)',
  border: '1px solid var(--theia-border-color)',
  borderRadius: '4px',
};

const formTitle: React.CSSProperties = {
  fontWeight: 600, fontSize: '12px', marginBottom: '10px',
  color: 'var(--theia-foreground)',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', marginBottom: '3px', marginTop: '8px',
  color: 'var(--theia-descriptionForeground)',
};

const required: React.CSSProperties = { color: 'var(--theia-errorForeground)' };

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', fontSize: '12px',
  background: 'var(--theia-input-background)',
  color: 'var(--theia-input-foreground)',
  border: '1px solid var(--theia-input-border, var(--theia-border-color))',
  borderRadius: '3px',
};

const fileInput: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theia-foreground)',
  marginTop: '2px',
};

const selectStyle: React.CSSProperties = { ...inputStyle };

const hashLine: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginTop: '3px',
};

const hashCode: React.CSSProperties = {
  fontFamily: 'var(--theia-code-font-family, monospace)', fontSize: '10px',
};

const recordList: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '6px',
};

function recordCard(status: string): React.CSSProperties {
  const borderColors: Record<string, string> = {
    pending: 'var(--theia-border-color)',
    flashing: '#6366f1',
    success: '#166534',
    failed: '#7f1d1d',
  };
  return {
    padding: '10px 12px',
    background: 'var(--theia-editor-background)',
    border: `1px solid ${borderColors[status] ?? 'var(--theia-border-color)'}`,
    borderRadius: '4px',
  };
}

const recordHeader: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px',
};

const recordFilename: React.CSSProperties = {
  fontWeight: 600, fontSize: '12px', color: 'var(--theia-foreground)',
};

function statusBadge(status: string): React.CSSProperties {
  const colors: Record<string, { bg: string; color: string }> = {
    pending:  { bg: '#1e293b', color: '#94a3b8' },
    flashing: { bg: '#312e81', color: '#c7d2fe' },
    success:  { bg: '#166534', color: '#dcfce7' },
    failed:   { bg: '#7f1d1d', color: '#fee2e2' },
  };
  const { bg, color } = colors[status] ?? { bg: '#1e293b', color: '#94a3b8' };
  return {
    fontSize: '10px', padding: '1px 7px', borderRadius: '10px',
    background: bg, color,
  };
}

const recordMeta: React.CSSProperties = {
  fontSize: '11px', color: 'var(--theia-descriptionForeground)', marginBottom: '3px',
};

const recordHash: React.CSSProperties = {
  fontSize: '10px', color: 'var(--theia-descriptionForeground)', marginBottom: '4px',
};

const recordResult: React.CSSProperties = {
  fontSize: '11px', color: '#22c55e', marginBottom: '4px',
};

const recordError: React.CSSProperties = {
  fontSize: '11px', color: '#ef4444', marginBottom: '4px',
};

const baseBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '3px',
  border: '1px solid transparent',
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-button-background)',
  color: 'var(--theia-button-foreground)',
};

const smallBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-secondaryButton-background)',
  color: 'var(--theia-secondaryButton-foreground)',
  border: '1px solid var(--theia-border-color)',
};
