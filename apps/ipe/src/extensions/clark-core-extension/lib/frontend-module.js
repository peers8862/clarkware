"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkCoreModule = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const frontend_application_contribution_1 = require("@theia/core/lib/browser/frontend-application-contribution");
const clark_widget_1 = require("./clark-widget");
const job_context_widget_1 = require("./job-context-widget");
const notes_widget_1 = require("./notes-widget");
exports.ClarkCoreModule = new inversify_1.ContainerModule((bind) => {
    // Open Clark panel on startup — no class, no @inject, just a plain object
    bind(frontend_application_contribution_1.FrontendApplicationContribution).toDynamicValue((ctx) => ({
        initializeLayout: async () => {
            const shell = ctx.container.get(browser_1.ApplicationShell);
            const widgetManager = ctx.container.get(browser_1.WidgetManager);
            const widget = await widgetManager.getOrCreateWidget(clark_widget_1.CLARK_WIDGET_ID);
            await shell.addWidget(widget, { area: 'main' });
            shell.activateWidget(clark_widget_1.CLARK_WIDGET_ID);
        },
    })).inSingletonScope();
    // Clark main panel
    bind(clark_widget_1.ClarkWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: clark_widget_1.CLARK_WIDGET_ID,
        createWidget: () => ctx.container.get(clark_widget_1.ClarkWidget),
    })).inSingletonScope();
    // Job context panel
    bind(job_context_widget_1.JobContextWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: job_context_widget_1.JOB_CONTEXT_WIDGET_ID,
        createWidget: () => ctx.container.get(job_context_widget_1.JobContextWidget),
    })).inSingletonScope();
    // Notes panel
    bind(notes_widget_1.NotesWidget).toSelf();
    bind(browser_1.WidgetFactory).toDynamicValue((ctx) => ({
        id: notes_widget_1.NOTES_WIDGET_ID,
        createWidget: () => ctx.container.get(notes_widget_1.NotesWidget),
    })).inSingletonScope();
});
exports.default = exports.ClarkCoreModule;
