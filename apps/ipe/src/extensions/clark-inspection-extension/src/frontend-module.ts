import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { WorkmanshipWidget, WORKMANSHIP_WIDGET_ID } from './workmanship-widget';

export const ClarkInspectionModule = new ContainerModule((bind) => {
  bind(WorkmanshipWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: WORKMANSHIP_WIDGET_ID,
    createWidget: () => ctx.container.get(WorkmanshipWidget),
  })).inSingletonScope();
});

export default ClarkInspectionModule;
