import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { FirmwareWidget, FIRMWARE_WIDGET_ID } from './firmware-widget';

export const ClarkFirmwareModule = new ContainerModule((bind) => {
  bind(FirmwareWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: FIRMWARE_WIDGET_ID,
    createWidget: () => ctx.container.get(FirmwareWidget),
  })).inSingletonScope();
});

export default ClarkFirmwareModule;
