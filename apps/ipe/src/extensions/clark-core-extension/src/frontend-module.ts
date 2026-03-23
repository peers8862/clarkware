import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, bindViewContribution, FrontendApplicationContribution } from '@theia/core/lib/browser';
import { ClarkWidget, CLARK_WIDGET_ID } from './clark-widget.js';
import { JobContextWidget, JOB_CONTEXT_WIDGET_ID } from './job-context-widget.js';
import { NotesWidget, NOTES_WIDGET_ID } from './notes-widget.js';

export const ClarkCoreModule = new ContainerModule((bind) => {
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
