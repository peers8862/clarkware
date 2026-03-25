import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import { fetchJob, startJob, resumeJob, reopenJob, updateJob, notifyJobListChanged } from './clark-api';
import type { JobDetail } from './clark-api';

export const JOB_CONTEXT_WIDGET_ID = 'clark-job-context';

type PanelState =
  | { mode: 'idle' }
  | { mode: 'loading' }
  | { mode: 'ready'; job: JobDetail }
  | { mode: 'editing'; job: JobDetail; draft: EditDraft; saving: boolean; error: string | null }
  | { mode: 'error'; message: string };

interface EditDraft {
  title: string;
  description: string;
  priority: string;
}

@injectable()
export class JobContextWidget extends ReactWidget {
  static readonly ID = JOB_CONTEXT_WIDGET_ID;
  static readonly LABEL = 'Job Context';

  private state: PanelState = { mode: 'idle' };
  private actionError: string | null = null;
  private actionInProgress: string | null = null; // which action is running

  constructor() {
    super();
    this.id = JOB_CONTEXT_WIDGET_ID;
    this.title.label = JobContextWidget.LABEL;
    this.title.closable = false;
    this.update();

    window.addEventListener('clark:job-selected', (e) => {
      const { jobId } = (e as CustomEvent<{ jobId: string }>).detail;
      this.loadJob(jobId);
    });
  }

  private get currentJobId(): string | null {
    if (this.state.mode === 'ready' || this.state.mode === 'editing') return this.state.job.id;
    return null;
  }

  private async loadJob(jobId: string): Promise<void> {
    this.state = { mode: 'loading' };
    this.actionError = null;
    this.update();
    try {
      const job = await fetchJob(jobId);
      this.state = { mode: 'ready', job };
    } catch (e) {
      this.state = { mode: 'error', message: String(e) };
    }
    this.update();
  }

  private async reloadCurrentJob(): Promise<void> {
    const id = this.currentJobId;
    if (id) await this.loadJob(id);
  }

  // --- Actions ---

  private async handleStart(): Promise<void> {
    if (this.state.mode !== 'ready') return;
    const id = this.state.job.id;
    this.actionInProgress = 'start';
    this.actionError = null;
    this.update();
    try {
      await startJob(id);
      notifyJobListChanged();
      await this.reloadCurrentJob();
    } catch (e) {
      this.actionError = String(e);
    }
    this.actionInProgress = null;
    this.update();
  }

  private async handleResume(): Promise<void> {
    if (this.state.mode !== 'ready') return;
    const id = this.state.job.id;
    this.actionInProgress = 'resume';
    this.actionError = null;
    this.update();
    try {
      await resumeJob(id);
      notifyJobListChanged();
      await this.reloadCurrentJob();
    } catch (e) {
      this.actionError = String(e);
    }
    this.actionInProgress = null;
    this.update();
  }

  private async handleReopen(): Promise<void> {
    if (this.state.mode !== 'ready') return;
    const id = this.state.job.id;
    this.actionInProgress = 'reopen';
    this.actionError = null;
    this.update();
    try {
      await reopenJob(id);
      notifyJobListChanged();
      await this.reloadCurrentJob();
    } catch (e) {
      this.actionError = String(e);
    }
    this.actionInProgress = null;
    this.update();
  }

  private async handleStatusChange(status: string): Promise<void> {
    if (this.state.mode !== 'ready') return;
    const id = this.state.job.id;
    this.actionInProgress = status;
    this.actionError = null;
    this.update();
    try {
      await updateJob(id, { status });
      notifyJobListChanged();
      await this.reloadCurrentJob();
    } catch (e) {
      this.actionError = String(e);
    }
    this.actionInProgress = null;
    this.update();
  }

  // --- Edit mode ---

  private enterEditMode(): void {
    if (this.state.mode !== 'ready') return;
    const { job } = this.state;
    this.state = {
      mode: 'editing',
      job,
      draft: { title: job.title, description: job.description ?? '', priority: job.priority },
      saving: false,
      error: null,
    };
    this.update();
  }

  private cancelEdit(): void {
    if (this.state.mode !== 'editing') return;
    this.state = { mode: 'ready', job: this.state.job };
    this.update();
  }

  private setDraftField<K extends keyof EditDraft>(key: K, value: EditDraft[K]): void {
    if (this.state.mode !== 'editing') return;
    this.state = { ...this.state, draft: { ...this.state.draft, [key]: value } };
    this.update();
  }

  private async handleSaveEdit(): Promise<void> {
    if (this.state.mode !== 'editing') return;
    const { job, draft } = this.state;
    if (!draft.title.trim()) {
      this.state = { ...this.state, error: 'Title is required' };
      this.update();
      return;
    }
    this.state = { ...this.state, saving: true, error: null };
    this.update();
    try {
      await updateJob(job.id, {
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        priority: draft.priority,
      });
      notifyJobListChanged();
      await this.reloadCurrentJob();
    } catch (e) {
      this.state = { ...this.state, saving: false, error: String(e) };
      this.update();
    }
  }

  // --- Render ---

  protected render(): React.ReactNode {
    return (
      <div style={{ padding: '12px 16px' }}>
        {this.renderContent()}
      </div>
    );
  }

  private renderContent(): React.ReactNode {
    const s = this.state;

    if (s.mode === 'idle') {
      return (
        <>
          <div style={sectionLabel}>Job Context</div>
          <p style={muted}>No active job</p>
        </>
      );
    }
    if (s.mode === 'loading') {
      return (
        <>
          <div style={sectionLabel}>Job Context</div>
          <p style={muted}>Loading…</p>
        </>
      );
    }
    if (s.mode === 'error') {
      return (
        <>
          <div style={sectionLabel}>Job Context</div>
          <p style={{ color: 'var(--theia-errorForeground)', fontSize: '12px' }}>{s.message}</p>
        </>
      );
    }
    if (s.mode === 'editing') {
      return this.renderEditForm(s.job, s.draft, s.saving, s.error);
    }
    // ready
    return this.renderJobView(s.job);
  }

  private renderJobView(job: JobDetail): React.ReactNode {
    const busy = this.actionInProgress !== null;
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={sectionLabel}>Job Context</div>
          {canEdit(job.status) && (
            <button style={smallBtn} onClick={() => this.enterEditMode()} disabled={busy}>Edit</button>
          )}
        </div>

        {this.actionError && (
          <div style={{ color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }}>
            {this.actionError}
          </div>
        )}

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '14px' }}>
          <tbody>
            {jobRows(job).map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid var(--theia-border-color)' }}>
                <td style={{ padding: '5px 8px 5px 0', color: 'var(--theia-descriptionForeground)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                  {label}
                </td>
                <td style={{ padding: '5px 0', color: 'var(--theia-foreground)', wordBreak: 'break-all' }}>
                  {label === 'Status' ? <StatusChip status={value} /> : value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {this.renderActions(job, busy)}
      </>
    );
  }

  private renderActions(job: JobDetail, busy: boolean): React.ReactNode {
    const { status } = job;

    if (status === 'draft') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={primaryBtn}
            disabled={busy}
            onClick={() => this.handleStart()}
          >
            {this.actionInProgress === 'start' ? 'Starting…' : 'Start Job'}
          </button>
        </div>
      );
    }

    if (status === 'active') {
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={smallBtn} disabled={busy} onClick={() => this.handleStatusChange('paused')}>
            {this.actionInProgress === 'paused' ? '…' : 'Pause'}
          </button>
          <button style={successBtn} disabled={busy} onClick={() => this.handleStatusChange('completed')}>
            {this.actionInProgress === 'completed' ? '…' : 'Complete'}
          </button>
          <button style={dangerBtn} disabled={busy} onClick={() => this.handleStatusChange('voided')}>
            {this.actionInProgress === 'voided' ? '…' : 'Void'}
          </button>
        </div>
      );
    }

    if (status === 'paused') {
      return (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button style={primaryBtn} disabled={busy} onClick={() => this.handleResume()}>
            {this.actionInProgress === 'resume' ? '…' : 'Resume'}
          </button>
          <button style={successBtn} disabled={busy} onClick={() => this.handleStatusChange('completed')}>
            {this.actionInProgress === 'completed' ? '…' : 'Complete'}
          </button>
          <button style={dangerBtn} disabled={busy} onClick={() => this.handleStatusChange('voided')}>
            {this.actionInProgress === 'voided' ? '…' : 'Void'}
          </button>
        </div>
      );
    }

    if (status === 'completed' || status === 'voided') {
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={smallBtn} disabled={busy} onClick={() => this.handleReopen()}>
            {this.actionInProgress === 'reopen' ? '…' : 'Reopen'}
          </button>
        </div>
      );
    }

    return null;
  }

  private renderEditForm(job: JobDetail, draft: EditDraft, saving: boolean, error: string | null): React.ReactNode {
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={sectionLabel}>Edit Job</div>
        </div>

        {error && (
          <div style={{ color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }}>
            {error}
          </div>
        )}

        <label style={labelStyle}>Title *</label>
        <input
          style={inputStyle}
          value={draft.title}
          disabled={saving}
          onChange={(e) => this.setDraftField('title', (e.target as HTMLInputElement).value)}
        />

        <label style={labelStyle}>Priority</label>
        <select
          style={inputStyle}
          value={draft.priority}
          disabled={saving}
          onChange={(e) => this.setDraftField('priority', (e.target as HTMLSelectElement).value)}
        >
          {['low', 'medium', 'high', 'critical'].map(p => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <label style={labelStyle}>Description</label>
        <textarea
          style={{ ...inputStyle, height: '70px', resize: 'vertical' }}
          value={draft.description}
          disabled={saving}
          onChange={(e) => this.setDraftField('description', (e.target as HTMLTextAreaElement).value)}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          <button
            style={primaryBtn}
            disabled={saving}
            onClick={() => this.handleSaveEdit()}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            style={smallBtn}
            disabled={saving}
            onClick={() => this.cancelEdit()}
          >
            Cancel
          </button>
        </div>

        <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--theia-border-color)', fontSize: '11px', color: 'var(--theia-descriptionForeground)' }}>
          ID: {job.id}
        </div>
      </>
    );
  }
}

// --- Helpers ---

function canEdit(status: string): boolean {
  return status === 'draft' || status === 'active' || status === 'paused';
}

function jobRows(job: JobDetail): [string, string][] {
  const rows: [string, string][] = [
    ['Title',    job.title],
    ['Status',   job.status],
    ['Type',     job.job_type ?? '—'],
    ['Priority', job.priority],
  ];
  if (job.description) rows.push(['Description', job.description]);
  rows.push(['Workstation', job.workstation_id]);
  rows.push(['ID', job.id]);
  return rows;
}

function StatusChip({ status }: { status: string }): React.ReactElement {
  const colors: Record<string, string> = {
    active: '#22c55e', draft: '#f59e0b', paused: '#6366f1',
    completed: '#64748b', voided: '#ef4444',
  };
  return <span style={{ color: colors[status] ?? 'inherit', fontWeight: 500 }}>{status}</span>;
}

// --- Styles ---

const sectionLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)',
  margin: 0,
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', marginBottom: '3px', marginTop: '10px',
  color: 'var(--theia-descriptionForeground)',
};

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '5px 8px', fontSize: '12px',
  background: 'var(--theia-input-background)',
  color: 'var(--theia-input-foreground)',
  border: '1px solid var(--theia-input-border, var(--theia-border-color))',
  borderRadius: '3px',
};

const baseBtn: React.CSSProperties = {
  padding: '4px 10px', fontSize: '12px', cursor: 'pointer', borderRadius: '3px',
  border: '1px solid transparent',
};

const smallBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-secondaryButton-background)',
  color: 'var(--theia-secondaryButton-foreground)',
  border: '1px solid var(--theia-border-color)',
};

const primaryBtn: React.CSSProperties = {
  ...baseBtn,
  background: 'var(--theia-button-background)',
  color: 'var(--theia-button-foreground)',
};

const successBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#166534',
  color: '#dcfce7',
};

const dangerBtn: React.CSSProperties = {
  ...baseBtn,
  background: '#7f1d1d',
  color: '#fee2e2',
};
