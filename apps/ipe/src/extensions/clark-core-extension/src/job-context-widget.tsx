import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';

export const JOB_CONTEXT_WIDGET_ID = 'clark-job-context';

interface JobContext {
  id: string;
  name: string;
  status: string;
  facilityId: string;
  workstationId: string;
}

@injectable()
export class JobContextWidget extends ReactWidget {
  static readonly ID = JOB_CONTEXT_WIDGET_ID;
  static readonly LABEL = 'Job Context';

  private jobContext: JobContext | null = null;

  constructor() {
    super();
    this.id = JOB_CONTEXT_WIDGET_ID;
    this.title.label = JobContextWidget.LABEL;
    this.title.closable = false;
    this.update();
  }

  setJobContext(ctx: JobContext | null): void {
    this.jobContext = ctx;
    this.update();
  }

  protected render(): React.ReactNode {
    const { jobContext } = this;
    return (
      <div className="clark-job-context" style={{ padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--theia-descriptionForeground)' }}>
          Job Context
        </div>
        {jobContext ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              <tr><td style={{ paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }}>Job</td><td>{jobContext.name}</td></tr>
              <tr><td style={{ paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }}>Status</td><td><span style={{ textTransform: 'capitalize' }}>{jobContext.status}</span></td></tr>
              <tr><td style={{ paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }}>Workstation</td><td>{jobContext.workstationId}</td></tr>
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'var(--theia-descriptionForeground)', fontSize: '13px', margin: 0 }}>
            No active job
          </p>
        )}
      </div>
    );
  }
}
