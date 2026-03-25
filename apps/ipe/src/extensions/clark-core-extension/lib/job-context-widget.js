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
const clark_api_1 = require("./clark-api");
exports.JOB_CONTEXT_WIDGET_ID = 'clark-job-context';
let JobContextWidget = JobContextWidget_1 = class JobContextWidget extends widgets_1.ReactWidget {
    constructor() {
        super();
        this.job = null;
        this.loading = false;
        this.error = null;
        this.id = exports.JOB_CONTEXT_WIDGET_ID;
        this.title.label = JobContextWidget_1.LABEL;
        this.title.closable = false;
        this.update();
        window.addEventListener('clark:job-selected', (e) => {
            const { jobId } = e.detail;
            this.loadJob(jobId);
        });
    }
    async loadJob(jobId) {
        this.loading = true;
        this.error = null;
        this.update();
        try {
            this.job = await (0, clark_api_1.fetchJob)(jobId);
        }
        catch (e) {
            this.error = String(e);
        }
        this.loading = false;
        this.update();
    }
    render() {
        return ((0, jsx_runtime_1.jsxs)("div", { style: { padding: '12px 16px' }, children: [(0, jsx_runtime_1.jsx)("div", { style: sectionLabel, children: "Job Context" }), this.loading && (0, jsx_runtime_1.jsx)("p", { style: muted, children: "Loading\u2026" }), this.error && (0, jsx_runtime_1.jsx)("p", { style: { color: 'var(--theia-errorForeground)', fontSize: '12px' }, children: this.error }), !this.loading && !this.error && this.job ? this.renderJob(this.job) : null, !this.loading && !this.error && !this.job && ((0, jsx_runtime_1.jsx)("p", { style: muted, children: "No active job" }))] }));
    }
    renderJob(job) {
        const rows = [
            ['Job', job.title],
            ['Status', job.status],
            ['Type', job.job_type ?? '—'],
            ['Priority', job.priority],
            ['Workstation', job.workstation_id],
            ['ID', job.id],
        ];
        if (job.description)
            rows.push(['Description', job.description]);
        return ((0, jsx_runtime_1.jsx)("table", { style: { width: '100%', borderCollapse: 'collapse', fontSize: '12px' }, children: (0, jsx_runtime_1.jsx)("tbody", { children: rows.map(([label, value]) => ((0, jsx_runtime_1.jsxs)("tr", { style: { borderBottom: '1px solid var(--theia-border-color)' }, children: [(0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 8px 5px 0', color: 'var(--theia-descriptionForeground)', whiteSpace: 'nowrap', verticalAlign: 'top' }, children: label }), (0, jsx_runtime_1.jsx)("td", { style: { padding: '5px 0', color: 'var(--theia-foreground)', wordBreak: 'break-all' }, children: value })] }, label))) }) }));
    }
};
exports.JobContextWidget = JobContextWidget;
JobContextWidget.ID = exports.JOB_CONTEXT_WIDGET_ID;
JobContextWidget.LABEL = 'Job Context';
exports.JobContextWidget = JobContextWidget = JobContextWidget_1 = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], JobContextWidget);
const sectionLabel = {
    fontWeight: 600, fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '10px',
    color: 'var(--theia-descriptionForeground)',
};
const muted = {
    color: 'var(--theia-descriptionForeground)', fontSize: '12px', margin: 0,
};
