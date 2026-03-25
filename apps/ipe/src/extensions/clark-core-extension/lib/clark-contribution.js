"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkFrontendContribution = void 0;
const inversify_1 = require("@theia/core/shared/inversify");
const browser_1 = require("@theia/core/lib/browser");
const clark_widget_1 = require("./clark-widget");
let ClarkFrontendContribution = class ClarkFrontendContribution {
    async initializeLayout() {
        const widget = await this.widgetManager.getOrCreateWidget(clark_widget_1.CLARK_WIDGET_ID);
        await this.shell.addWidget(widget, { area: 'main' });
        this.shell.activateWidget(clark_widget_1.CLARK_WIDGET_ID);
    }
};
exports.ClarkFrontendContribution = ClarkFrontendContribution;
__decorate([
    (0, inversify_1.inject)(browser_1.ApplicationShell),
    __metadata("design:type", browser_1.ApplicationShell)
], ClarkFrontendContribution.prototype, "shell", void 0);
__decorate([
    (0, inversify_1.inject)(browser_1.WidgetManager),
    __metadata("design:type", browser_1.WidgetManager)
], ClarkFrontendContribution.prototype, "widgetManager", void 0);
exports.ClarkFrontendContribution = ClarkFrontendContribution = __decorate([
    (0, inversify_1.injectable)()
], ClarkFrontendContribution);
