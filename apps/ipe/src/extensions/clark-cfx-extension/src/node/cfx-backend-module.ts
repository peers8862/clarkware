import { ContainerModule } from '@theia/core/shared/inversify';
import { BackendApplicationContribution } from '@theia/core/lib/node/backend-application';
import { ConnectionHandler, JsonRpcConnectionHandler } from '@theia/core/lib/common/messaging';
import { CFXPublisher } from './cfx-publisher';
import { ICFXPublisher, CFX_STATUS_PATH } from '../common/cfx-types';

export default new ContainerModule((bind) => {
  bind(CFXPublisher).toSelf().inSingletonScope();
  bind(ICFXPublisher).toService(CFXPublisher);
  bind(BackendApplicationContribution).toService(CFXPublisher);

  // Expose connection status to the frontend via JSON-RPC
  bind(ConnectionHandler).toDynamicValue(ctx =>
    new JsonRpcConnectionHandler(CFX_STATUS_PATH, () => {
      const publisher = ctx.container.get<ICFXPublisher>(ICFXPublisher);
      return {
        getStatus: () => publisher.connectionStatus,
      };
    })
  ).inSingletonScope();
});
