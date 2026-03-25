"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const frontend_application_config_provider_1 = require("@theia/core/lib/browser/frontend-application-config-provider");
const browser_frontend_application_module_1 = require("@theia/core/lib/browser/browser-frontend-application-module");
frontend_application_config_provider_1.FrontendApplicationConfigProvider.set({
    applicationName: 'Clark IPE',
});
const container = new inversify_1.Container();
exports.container = container;
container.load(browser_frontend_application_module_1.BrowserFrontendApplicationModule);
// Load Clark extensions
import('./extensions/clark-core-extension/src/frontend-module').then(({ ClarkCoreModule }) => {
    container.load(ClarkCoreModule);
});
import('./extensions/clark-messaging-extension/src/frontend-module').then(({ ClarkMessagingModule }) => {
    container.load(ClarkMessagingModule);
});
//# sourceMappingURL=browser-app.js.map