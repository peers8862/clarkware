import { Container } from '@theia/core/shared/inversify';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { frontendApplicationModule } from '@theia/core/lib/browser/frontend-application-module';

FrontendApplicationConfigProvider.set({
  applicationName: 'Clark IPE',
});

const container = new Container();
container.load(frontendApplicationModule);

// Load Clark extensions
import('./extensions/clark-core-extension/src/frontend-module.js').then(({ ClarkCoreModule }) => {
  container.load(ClarkCoreModule);
});
import('./extensions/clark-messaging-extension/src/frontend-module.js').then(({ ClarkMessagingModule }) => {
  container.load(ClarkMessagingModule);
});

export { container };
