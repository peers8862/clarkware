import { Container } from '@theia/core/shared/inversify';
import { FrontendApplicationConfigProvider } from '@theia/core/lib/browser/frontend-application-config-provider';
import { BrowserFrontendApplicationModule } from '@theia/core/lib/browser/browser-frontend-application-module';

FrontendApplicationConfigProvider.set({
  applicationName: 'Clark IPE',
});

const container = new Container();
container.load(BrowserFrontendApplicationModule);

// Load Clark extensions
import('./extensions/clark-core-extension/src/frontend-module').then(({ ClarkCoreModule }) => {
  container.load(ClarkCoreModule);
});
import('./extensions/clark-messaging-extension/src/frontend-module').then(({ ClarkMessagingModule }) => {
  container.load(ClarkMessagingModule);
});

export { container };
