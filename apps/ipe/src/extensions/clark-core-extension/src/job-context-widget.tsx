import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';
import { fetchJob } from './clark-api';
import type { JobDetail } from './clark-api';

export const JOB_CONTEXT_WIDGET_ID = 'clark-job-context';

@injectable()
export class JobContextWidget extends ReactWidget {
  static readonly ID = JOB_CONTEXT_WIDGET_ID;
  static readonly LABEL = 'Job Context';

  private job: JobDetail | null = null;
  private loading = false;
  private error: string | null = null;

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

  private async loadJob(jobId: string): Promise<void> {
    this.loading = true;
    this.error = null;
    this.update();
    try {
      this.job = await fetchJob(jobId);
    } catch (e) {
      this.error = String(e);
    }
    this.loading = false;
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div style={{ padding: '12px 16px' }}>
        <div style={sectionLabel}>Job Context</div>
        {this.loading && <p style={muted}>Loading…</p>}
        {this.error && <p style={{ color: 'var(--theia-errorForeground)', fontSize: '12px' }}>{this.error}</p>}
        {!this.loading && !this.error && this.job ? this.renderJob(this.job) : null}
        {!this.loading && !this.error && !this.job && (
          <p style={muted}>No active job</p>
        )}
      </div>
    );
  }

  private renderJob(job: JobDetail): React.ReactNode {
    const rows: [string, string][] = [
      ['Job',         job.title],
      ['Status',      job.status],
      ['Type',        job.job_type ?? '—'],
      ['Priority',    job.priority],
      ['Workstation', job.workstation_id],
      ['ID',          job.id],
    ];
    if (job.description) rows.push(['Description', job.description]);

    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--theia-border-color)' }}>
              <td style={{ padding: '5px 8px 5px 0', color: 'var(--theia-descriptionForeground)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                {label}
              </td>
              <td style={{ padding: '5px 0', color: 'var(--theia-foreground)', wordBreak: 'break-all' }}>
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
}

const sectionLabel: React.CSSProperties = {
  fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
  letterSpacing: '0.05em', marginBottom: '10px',
  color: 'var(--theia-descriptionForeground)',
};

const muted: React.CSSProperties = {
  color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
