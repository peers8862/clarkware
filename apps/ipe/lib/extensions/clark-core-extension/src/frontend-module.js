"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkCoreModule = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const clark_widget_js_1 = require("./clark-widget.js");
const job_context_widget_js_1 = require("./job-context-widget.js");
const notes_widget_js_1 = require("./notes-widget.js");
exports.ClarkCoreModule = new inversify_1.ContainerModule((bind) => {
    // Clark main panel
    bind(clark_widget_js_1.ClarkWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: clark_widget_js_1.CLARK_WIDGET_ID,
        createWidget: () => ctx.container.get(clark_widget_js_1.ClarkWidget),
    })).inSingletonScope();
    // Job context panel
    bind(job_context_widget_js_1.JobContextWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: job_context_widget_js_1.JOB_CONTEXT_WIDGET_ID,
        createWidget: () => ctx.container.get(job_context_widget_js_1.JobContextWidget),
    })).inSingletonScope();
    // Notes panel
    bind(notes_widget_js_1.NotesWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: notes_widget_js_1.NOTES_WIDGET_ID,
        createWidget: () => ctx.container.get(notes_widget_js_1.NotesWidget),
    })).inSingletonScope();
});
//# sourceMappingURL=frontend-module.js.map