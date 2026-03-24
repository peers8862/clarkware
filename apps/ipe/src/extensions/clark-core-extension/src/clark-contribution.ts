import { injectable, inject } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { CLARK_WIDGET_ID } from './clark-widget';

@injectable()
export class ClarkFrontendContribution implements FrontendApplicationContribution {
  @inject(ApplicationShell)
  protected readonly shell!: ApplicationShell;

  @inject(WidgetManager)
  protected readonly widgetManager!: WidgetManager;

  async initializeLayout(): Promise<void> {
    const widget = await this.widgetManager.getOrCreateWidget(CLARK_WIDGET_ID);
    await this.shell.addWidget(widget, { area: 'main' });
    this.shell.activateWidget(CLARK_WIDGET_ID);
  }
}
