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
var ClarkWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClarkWidget = exports.CLARK_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
exports.CLARK_WIDGET_ID = 'clark-main-panel';
let ClarkWidget = class ClarkWidget extends widgets_1.ReactWidget {
    static { ClarkWidget_1 = this; }
    static ID = exports.CLARK_WIDGET_ID;
    static LABEL = 'Clark';
    constructor() {
        super();
        this.id = exports.CLARK_WIDGET_ID;
        this.title.label = ClarkWidget_1.LABEL;
        this.title.closable = false;
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { className: "clark-main-panel", style: { display: 'flex', flexDirection: 'column', height: '100%' }, children: [(0, jsx_runtime_1.jsx)("div", { className: "clark-header", style: { padding: '8px 16px', borderBottom: '1px solid var(--theia-border-color)', fontWeight: 600, fontSize: '14px' }, children: "Clark Industrial Process Environment" }), (0, jsx_runtime_1.jsx)("div", { className: "clark-body", style: { flex: 1, overflow: 'auto', padding: '16px' }, children: (0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-descriptionForeground)', fontSize: '13px' }, children: "No job loaded. Select a job from the job list to begin." }) })] }));
    }
};
exports.ClarkWidget = ClarkWidget;
exports.ClarkWidget = ClarkWidget = ClarkWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ClarkWidget);
//# sourceMappingURL=clark-widget.js.map