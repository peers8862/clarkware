import { ContainerModule } from '@theia/core/shared/inversify';
import { FrontendApplicationContribution } from '@theia/core/lib/browser/frontend-application-contribution';
import { CFXStatusBarContribution } from './cfx-status-bar';

export default new ContainerModule((bind) => {
  bind(CFXStatusBarContribution).toSelf().inSingletonScope();
  bind(FrontendApplicationContribution).toService(CFXStatusBarContribution);
});
