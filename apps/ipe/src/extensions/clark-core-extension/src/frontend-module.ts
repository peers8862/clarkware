import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory, ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { ClarkWidget, CLARK_WIDGET_ID } from './clark-widget';
import { JobContextWidget, JOB_CONTEXT_WIDGET_ID } from './job-context-widget';
import { NotesWidget, NOTES_WIDGET_ID } from './notes-widget';

// Widget IDs from other extensions — referenced by string to avoid hard import deps
const MESSAGING_WIDGET_ID = 'clark-messaging';
const WORKMANSHIP_WIDGET_ID = 'clark-workmanship';
const FIRMWARE_WIDGET_ID = 'clark-firmware';

async function ensureClarkLayout(shell: ApplicationShell, widgetManager: WidgetManager): Promise<void> {
  // Each addWidget call is wrapped individually — a widget already in the shell will throw,
  // which we catch and ignore so the remaining panels still open.
  const add = async (id: string, area: 'main' | 'left' | 'bottom', rank?: number) => {
    try {
      const w = await widgetManager.getOrCreateWidget(id);
      await shell.addWidget(w, rank !== undefined ? { area, rank } : { area });
    } catch {
      // Widget already in shell from a restored layout — nothing to do
    }
  };

  await add(CLARK_WIDGET_ID, 'main');
  shell.activateWidget(CLARK_WIDGET_ID);
  await add(JOB_CONTEXT_WIDGET_ID, 'left', 100);
  shell.activateWidget(JOB_CONTEXT_WIDGET_ID);
  await add(NOTES_WIDGET_ID, 'bottom', 100);
  await add(MESSAGING_WIDGET_ID, 'bottom', 200);
  await add(WORKMANSHIP_WIDGET_ID, 'bottom', 300);
  await add(FIRMWARE_WIDGET_ID, 'bottom', 400);
  shell.activateWidget(NOTES_WIDGET_ID);
}

export const ClarkCoreModule = new ContainerModule((bind) => {
  // initializeLayout fires on fresh starts (no saved layout state)
  // onStart fires every time — handles layout-restore cases where initializeLayout is skipped
  bind(FrontendApplicationContribution).toDynamicValue((ctx) => ({
    initializeLayout: async () => {
      const shell = ctx.container.get(ApplicationShell);
      const widgetManager = ctx.container.get(WidgetManager);
      await ensureClarkLayout(shell, widgetManager);
    },
    onStart: async () => {
      const shell = ctx.container.get(ApplicationShell);
      const widgetManager = ctx.container.get(WidgetManager);
      await ensureClarkLayout(shell, widgetManager);
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
