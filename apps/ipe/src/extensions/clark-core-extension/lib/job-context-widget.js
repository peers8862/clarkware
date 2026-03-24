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
var JobContextWidget_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobContextWidget = exports.JOB_CONTEXT_WIDGET_ID = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const inversify_1 = require("@theia/core/shared/inversify");
const widgets_1 = require("@theia/core/lib/browser/widgets");
exports.JOB_CONTEXT_WIDGET_ID = 'clark-job-context';
let JobContextWidget = JobContextWidget_1 = class JobContextWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.jobContext = null;
        this.id = exports.JOB_CONTEXT_WIDGET_ID;
        this.title.label = JobContextWidget_1.LABEL;
        this.title.closable = false;
        this.update();
    }
    setJobContext(ctx) {
        this.jobContext = ctx;
        this.update();
    }
    render() {
        const { jobContext } = this;
        return ((0, jsx_runtime_1.jsxs)("div", { className: "clark-job-context", style: { padding: '12px 16px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: { fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', color: 'var(--theia-descriptionForeground)' }, children: "Job Context" }), jobContext ? ((0, jsx_runtime_1.jsx)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' }, children: (0, jsx_runtime_1.jsxs)("tbody", { children: [(0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: { paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }, children: "Job" }), (0, jsx_runtime_1.jsx)("td", { children: jobContext.name })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: { paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }, children: "Status" }), (0, jsx_runtime_1.jsx)("td", { children: (0, jsx_runtime_1.jsx)("span", { style: { textTransform: 'capitalize' }, children: jobContext.status }) })] }), (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { style: { paddingRight: '8px', color: 'var(--theia-descriptionForeground)' }, children: "Workstation" }), (0, jsx_runtime_1.jsx)("td", { children: jobContext.workstationId })] })] }) })) : ((0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-descriptionForeground)', fontSize: '13px', margin: 0 }, children: "No active job" }))] }));
    }
};
exports.JobContextWidget = JobContextWidget;
JobContextWidget.ID = exports.JOB_CONTEXT_WIDGET_ID;
JobContextWidget.LABEL = 'Job Context';
exports.JobContextWidget = JobContextWidget = JobContextWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], JobContextWidget);
