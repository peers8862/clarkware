import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
export declare class ClarkFrontendContribution implements FrontendApplicationContribution {
    protected readonly shell: ApplicationShell;
    protected readonly widgetManager: WidgetManager;
    initializeLayout(): Promise<void>;
}
