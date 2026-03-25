import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import {
  login, fetchJobs, fetchWorkstations, createJob,
  selectJob, getToken, clearSession, notifyJobListChanged,
} from './clark-api';
import type { Job, Workstation } from './clark-api';

export const CLARK_WIDGET_ID = 'clark-main-panel';

type AppState =
  | { phase: 'init' }
  | { phase: 'logging-in' }
  | { phase: 'loading-jobs' }
  | { phase: 'ready'; jobs: Job[]; workstations: Workstation[]; selectedJobId: string | null; showCreateForm: boolean }
  | { phase: 'error'; message: string };

interface CreateFormState {
  title: string;
  description: string;
  jobType: string;
  priority: string;
  humanRef: string;
  workstationId: string;
  submitting: boolean;
  error: string | null;
}

const defaultForm = (): CreateFormState => ({
  title: '', description: '', jobType: 'general', priority: 'medium',
  humanRef: '', workstationId: '', submitting: false, error: null,
});

@injectable()
export class ClarkWidget extends ReactWidget {
  static readonly ID = CLARK_WIDGET_ID;
  static readonly LABEL = 'Clark';

  private appState: AppState = { phase: 'init' };
  private form: CreateFormState = defaultForm();

  constructor() {
    super();
    this.id = CLARK_WIDGET_ID;
    this.title.label = ClarkWidget.LABEL;
    this.title.closable = false;
    this.update();
    setTimeout(() => this.initialize(), 0);

    window.addEventListener('clark:jobs-changed', () => {
      if (this.appState.phase === 'ready') {
        this.refreshJobs();
      }
    });
  }

  private async initialize(): Promise<void> {
    if (!getToken()) {
      await this.doLogin();
      if (this.appState.phase === 'error') return;
    }

    this.appState = { phase: 'loading-jobs' };
    this.update();

    try {
      const [jobs, workstations] = await Promise.all([fetchJobs(), fetchWorkstations()]);
      this.appState = { phase: 'ready', jobs, workstations, selectedJobId: null, showCreateForm: false };
    } catch (e) {
      const msg = String(e);
      if (msg.includes('401')) {
        clearSession();
        await this.doLogin();
        if (!getToken()) return;
        this.appState = { phase: 'loading-jobs' };
        this.update();
        try {
          const [jobs, workstations] = await Promise.all([fetchJobs(), fetchWorkstations()]);
          this.appState = { phase: 'ready', jobs, workstations, selectedJobId: null, showCreateForm: false };
        } catch (e2) {
          this.appState = { phase: 'error', message: `Could not load jobs: ${String(e2)}` };
        }
      } else {
        this.appState = { phase: 'error', message: `Could not load jobs: ${msg}` };
      }
    }
    this.update();
  }

  private async doLogin(): Promise<void> {
    this.appState = { phase: 'logging-in' };
    this.update();
    try {
      await login('admin', 'admin_dev_password');
    } catch (e) {
      this.appState = { phase: 'error', message: `Login failed: ${String(e)}` };
      this.update();
    }
  }

  private async refreshJobs(): Promise<void> {
    try {
      const jobs = await fetchJobs();
      if (this.appState.phase === 'ready') {
        this.appState = { ...this.appState, jobs };
        this.update();
      }
    } catch { /* silent */ }
  }

  private handleJobClick(job: Job): void {
    if (this.appState.phase !== 'ready') return;
    this.appState = { ...this.appState, selectedJobId: job.id };
    this.update();
    selectJob(job.id, job.title);
  }

  private toggleCreateForm(): void {
    if (this.appState.phase !== 'ready') return;
    const showing = !this.appState.showCreateForm;
    this.appState = { ...this.appState, showCreateForm: showing };
    if (showing) {
      // Pre-select first workstation if none selected
      if (!this.form.workstationId && this.appState.workstations.length > 0) {
        this.form = { ...this.form, workstationId: this.appState.workstations[0]!.id };
      }
    } else {
      this.form = defaultForm();
    }
    this.update();
  }

  private setFormField<K extends keyof CreateFormState>(key: K, value: CreateFormState[K]): void {
    this.form = { ...this.form, [key]: value };
    this.update();
  }

  private async handleCreateSubmit(): Promise<void> {
    if (this.appState.phase !== 'ready') return;
    if (!this.form.title.trim()) {
      this.form = { ...this.form, error: 'Title is required' };
      this.update();
      return;
    }
    if (!this.form.workstationId) {
      this.form = { ...this.form, error: 'Workstation is required' };
      this.update();
      return;
    }

    const ws = this.appState.workstations.find(w => w.id === this.form.workstationId);
    if (!ws) {
      this.form = { ...this.form, error: 'Invalid workstation' };
      this.update();
      return;
    }

    this.form = { ...this.form, submitting: true, error: null };
    this.update();

    try {
      const created = await createJob({
        title: this.form.title.trim(),
        facilityId: ws.facility_id,
        zoneId: ws.zone_id,
        workstationId: ws.id,
        description: this.form.description.trim() || undefined,
        jobType: this.form.jobType,
        priority: this.form.priority,
        humanRef: this.form.humanRef.trim() || undefined,
      });

      // Refresh list and select the new job
      const jobs = await fetchJobs();
      this.appState = { ...this.appState, jobs, selectedJobId: created.id, showCreateForm: false };
      this.form = defaultForm();
      selectJob(created.id, created.title);
      notifyJobListChanged();
    } catch (e) {
      this.form = { ...this.form, submitting: false, error: String(e) };
    }
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--theia-border-color)',
          fontWeight: 600, fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>Clark IPE</span>
          {this.appState.phase === 'ready' && (
            <button
              style={createBtnStyle(this.appState.showCreateForm)}
              onClick={() => this.toggleCreateForm()}
              title={this.appState.showCreateForm ? 'Cancel' : 'New job'}
            >
              {this.appState.showCreateForm ? '✕' : '+ New Job'}
            </button>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
          {this.renderBody()}
        </div>
      </div>
    );
  }

  private renderBody(): React.ReactNode {
    const state = this.appState;

    if (state.phase === 'init' || state.phase === 'logging-in') {
      return <p style={muted}>Connecting to Clark API…</p>;
    }
    if (state.phase === 'loading-jobs') {
      return <p style={muted}>Loading jobs…</p>;
    }
    if (state.phase === 'error') {
      return (
        <div>
          <p style={{ color: 'var(--theia-errorForeground)', fontSize: '13px' }}>{state.message}</p>
          <button style={btnStyle} onClick={() => this.initialize()}>Retry</button>
        </div>
      );
    }

    const { jobs, selectedJobId, showCreateForm, workstations } = state;

    return (
      <div>
        {showCreateForm && this.renderCreateForm(workstations)}

        {!showCreateForm && jobs.length === 0 && (
          <p style={muted}>No jobs found. Use "+ New Job" to create one.</p>
        )}

        {jobs.length > 0 && (
          <>
            <div style={sectionLabel}>Jobs</div>
            {jobs.map(job => (
              <div
                key={job.id}
                onClick={() => this.handleJobClick(job)}
                style={{
                  padding: '10px 12px',
                  marginBottom: '6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  background: selectedJobId === job.id
                    ? 'var(--theia-list-activeSelectionBackground)'
                    : 'var(--theia-editor-background)',
                  color: selectedJobId === job.id
                    ? 'var(--theia-list-activeSelectionForeground)'
                    : 'var(--theia-foreground)',
                  border: '1px solid var(--theia-border-color)',
                }}
              >
                <div style={{ fontWeight: 500, fontSize: '13px' }}>{job.title}</div>
                <div style={{ fontSize: '11px', marginTop: '3px', opacity: 0.7 }}>
                  {job.job_type} · {job.priority} · <StatusBadge status={job.status} />
                  {job.human_ref && <span> · {job.human_ref}</span>}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  private renderCreateForm(workstations: Workstation[]): React.ReactNode {
    const f = this.form;
    return (
      <div style={{
        background: 'var(--theia-editor-background)',
        border: '1px solid var(--theia-border-color)',
        borderRadius: '4px',
        padding: '14px',
        marginBottom: '16px',
      }}>
        <div style={sectionLabel}>New Job</div>

        {f.error && (
          <div style={{ color: 'var(--theia-errorForeground)', fontSize: '12px', marginBottom: '8px' }}>
            {f.error}
          </div>
        )}

        <label style={labelStyle}>Title *</label>
        <input
          style={inputStyle}
          value={f.title}
          placeholder="e.g. Hydraulic Pump Rebuild"
          disabled={f.submitting}
          onChange={(e) => this.setFormField('title', (e.target as HTMLInputElement).value)}
        />

        <label style={labelStyle}>Work Order # (optional)</label>
        <input
          style={inputStyle}
          value={f.humanRef}
          placeholder="e.g. WO-1042"
          disabled={f.submitting}
          onChange={(e) => this.setFormField('humanRef', (e.target as HTMLInputElement).value)}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select
              style={inputStyle}
              value={f.jobType}
              disabled={f.submitting}
              onChange={(e) => this.setFormField('jobType', (e.target as HTMLSelectElement).value)}
            >
              {['general', 'repair', 'calibration', 'inspection', 'assembly', 'test', 'maintenance'].map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priority</label>
            <select
              style={inputStyle}
              value={f.priority}
              disabled={f.submitting}
              onChange={(e) => this.setFormField('priority', (e.target as HTMLSelectElement).value)}
            >
              {['low', 'medium', 'high', 'critical'].map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        <label style={labelStyle}>Workstation *</label>
        <select
          style={inputStyle}
          value={f.workstationId}
          disabled={f.submitting}
          onChange={(e) => this.setFormField('workstationId', (e.target as HTMLSelectElement).value)}
        >
          {workstations.length === 0 && <option value="">No workstations available</option>}
          {workstations.map(ws => (
            <option key={ws.id} value={ws.id}>{ws.name}</option>
          ))}
        </select>

        <label style={labelStyle}>Description (optional)</label>
        <textarea
          style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
          value={f.description}
          placeholder="Brief description of the job…"
          disabled={f.submitting}
          onChange={(e) => this.setFormField('description', (e.target as HTMLTextAreaElement).value)}
        />

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <button
            style={{ ...btnStyle, background: 'var(--theia-button-background)', color: 'var(--theia-button-foreground)' }}
            disabled={f.submitting}
            onClick={() => this.handleCreateSubmit()}
          >
            {f.submitting ? 'Creating…' : 'Create Job'}
          </button>
          <button
            style={btnStyle}
            disabled={f.submitting}
            onClick={() => this.toggleCreateForm()}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }
}

function StatusBadge({ status }: { status: string }): React.ReactElement {
  const colors: Record<string, string> = {
    active: '#22c55e', draft: '#f59e0b', paused: '#6366f1',
    completed: '#64748b', voided: '#ef4444',
  };
  return (
    <span style={{ color: colors[status] ?? 'inherit' }}>{status}</span>
  );
}

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '13px',
};

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em',
  color: 'var(--theia-descriptionForeground)', marginBottom: '8px', fontWeight: 600,
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

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: '12px', cursor: 'pointer',
  background: 'var(--theia-secondaryButton-background)',
  color: 'var(--theia-secondaryButton-foreground)',
  border: '1px solid var(--theia-border-color)',
  borderRadius: '3px',
};

function createBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '3px 8px', fontSize: '11px', cursor: 'pointer', borderRadius: '3px',
    background: active ? 'transparent' : 'var(--theia-button-background)',
    color: active ? 'var(--theia-descriptionForeground)' : 'var(--theia-button-foreground)',
    border: `1px solid ${active ? 'var(--theia-border-color)' : 'transparent'}`,
  };
}
