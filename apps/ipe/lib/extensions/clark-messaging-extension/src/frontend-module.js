"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkMessagingModule = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const messaging_widget_js_1 = require("./messaging-widget.js");
exports.ClarkMessagingModule = new inversify_1.ContainerModule((bind) => {
    bind(messaging_widget_js_1.MessagingWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: messaging_widget_js_1.MESSAGING_WIDGET_ID,
        createWidget: () => ctx.container.get(messaging_widget_js_1.MessagingWidget),
    })).inSingletonScope();
});
//# sourceMappingURL=frontend-module.js.map