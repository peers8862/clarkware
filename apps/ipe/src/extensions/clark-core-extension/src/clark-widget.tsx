import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import { login, fetchJobs, selectJob, getToken, clearSession } from './clark-api';
import type { Job } from './clark-api';

export const CLARK_WIDGET_ID = 'clark-main-panel';

type AppState =
  | { phase: 'init' }
  | { phase: 'logging-in' }
  | { phase: 'loading-jobs' }
  | { phase: 'ready'; jobs: Job[]; selectedJobId: string | null }
  | { phase: 'error'; message: string };

@injectable()
export class ClarkWidget extends ReactWidget {
  static readonly ID = CLARK_WIDGET_ID;
  static readonly LABEL = 'Clark';

  private appState: AppState = { phase: 'init' };

  constructor() {
    super();
    this.id = CLARK_WIDGET_ID;
    this.title.label = ClarkWidget.LABEL;
    this.title.closable = false;
    this.update();
    // Kick off auth + job load after widget is attached
    setTimeout(() => this.initialize(), 0);
  }

  private async initialize(): Promise<void> {
    // Ensure we have a valid token
    if (!getToken()) {
      await this.doLogin();
      if (this.appState.phase === 'error') return;
    }

    this.appState = { phase: 'loading-jobs' };
    this.update();

    try {
      const jobs = await fetchJobs();
      this.appState = { phase: 'ready', jobs, selectedJobId: null };
    } catch (e) {
      const msg = String(e);
      // Stale token — clear and re-login once
      if (msg.includes('401')) {
        clearSession();
        await this.doLogin();
        if (!getToken()) return; // doLogin failed
        this.appState = { phase: 'loading-jobs' };
        this.update();
        try {
          const jobs = await fetchJobs();
          this.appState = { phase: 'ready', jobs, selectedJobId: null };
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

  private handleJobClick(job: Job): void {
    if (this.appState.phase !== 'ready') return;
    this.appState = { ...this.appState, selectedJobId: job.id };
    this.update();
    selectJob(job.id, job.title);
  }

  protected render(): React.ReactNode {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          padding: '8px 16px',
          borderBottom: '1px solid var(--theia-border-color)',
          fontWeight: 600, fontSize: '14px',
        }}>
          Clark Industrial Process Environment
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
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

    const { jobs, selectedJobId } = state;
    if (jobs.length === 0) {
      return <p style={muted}>No jobs found. Create a job to begin.</p>;
    }

    return (
      <div>
        <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--theia-descriptionForeground)', marginBottom: '8px' }}>
          Active Jobs
        </div>
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
            </div>
          </div>
        ))}
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

const btnStyle: React.CSSProperties = {
  padding: '4px 10px', fontSize: '12px', cursor: 'pointer', marginTop: '8px',
};
