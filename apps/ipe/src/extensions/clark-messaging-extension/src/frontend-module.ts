import { ContainerModule } from '@theia/core/shared/inversify';
import { WidgetFactory } from '@theia/core/lib/browser';
import { MessagingWidget, MESSAGING_WIDGET_ID } from './messaging-widget';

export const ClarkMessagingModule = new ContainerModule((bind) => {
  bind(MessagingWidget).toSelf();
  bind(WidgetFactory).toDynamicValue((ctx) => ({
    id: MESSAGING_WIDGET_ID,
    createWidget: () => ctx.container.get(MessagingWidget),
  })).inSingletonScope();
});

export default ClarkMessagingModule;
