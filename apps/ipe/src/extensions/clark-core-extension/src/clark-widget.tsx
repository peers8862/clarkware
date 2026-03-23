import * as React from 'react';
import { injectable } from '@theia/core/shared/inversify';
import { ReactWidget } from '@theia/core/lib/browser/widgets';

export const CLARK_WIDGET_ID = 'clark-main-panel';

@injectable()
export class ClarkWidget extends ReactWidget {
  static readonly ID = CLARK_WIDGET_ID;
  static readonly LABEL = 'Clark';

  constructor() {
    super();
    this.id = CLARK_WIDGET_ID;
    this.title.label = ClarkWidget.LABEL;
    this.title.closable = false;
    this.update();
  }

  protected render(): React.ReactNode {
    return (
      <div className="clark-main-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="clark-header" style={{ padding: '8px 16px', borderBottom: '1px solid var(--theia-border-color)', fontWeight: 600, fontSize: '14px' }}>
          Clark Industrial Process Environment
        </div>
        <div className="clark-body" style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <p style={{ color: 'var(--theia-descriptionForeground)', fontSize: '13px' }}>
            No job loaded. Select a job from the job list to begin.
          </p>
        </div>
      </div>
    );
  }
}
