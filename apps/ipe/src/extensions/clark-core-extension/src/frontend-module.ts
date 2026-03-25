import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ClarkWidget, CLARK_WIDGET_ID } from './clark-widget';
import { JobContextWidget, JOB_CONTEXT_WIDGET_ID } from './job-context-widget';
import { NotesWidget, NOTES_WIDGET_ID } from './notes-widget';

export const ClarkCoreModule = new ContainerModule((bind) => {
  // Open Clark panel on startup — no class, no @inject, just a plain object
  bind(FrontendApplicationContribution).toDynamicValue((ctx) => ({
    initializeLayout: async () => {
      const shell = ctx.container.get(ApplicationShell);
      const widgetManager = ctx.container.get(WidgetManager);
      const widget = await widgetManager.getOrCreateWidget(CLARK_WIDGET_ID);
      await shell.addWidget(widget, { area: 'main' });
      shell.activateWidget(CLARK_WIDGET_ID);
    },
  })).inSingletonScope();

  // Clark main panel
  bind(ClarkWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: CLARK_WIDGET_ID,
    createWidget: () => ctx.container.get(ClarkWidget),
  })).inSingletonScope();

  // Job context panel
  bind(JobContextWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: JOB_CONTEXT_WIDGET_ID,
    createWidget: () => ctx.container.get(JobContextWidget),
  })).inSingletonScope();

  // Notes panel
  bind(NotesWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: NOTES_WIDGET_ID,
    createWidget: () => ctx.container.get(NotesWidget),
  })).inSingletonScope();
});

export default ClarkCoreModule;
