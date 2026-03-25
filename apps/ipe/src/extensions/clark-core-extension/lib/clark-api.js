"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyJobListChanged = exports.selectJob = exports.postNote = exports.fetchNotes = exports.updateJob = exports.reopenJob = exports.resumeJob = exports.startJob = exports.createJob = exports.fetchWorkstations = exports.fetchJob = exports.fetchJobs = exports.login = exports.clearSession = exports.getActorId = exports.getToken = void 0;
const API_BASE = 'http://localhost:3000/v1';
const TOKEN_KEY = 'clark_access_token';
const ACTOR_KEY = 'clark_actor_id';
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
exports.getToken = getToken;
function getActorId() {
    return localStorage.getItem(ACTOR_KEY);
}
exports.getActorId = getActorId;
function clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ACTOR_KEY);
}
exports.clearSession = clearSession;
async function login(username, password) {
    const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Login failed (${res.status})`);
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(ACTOR_KEY, data.actorId);
    return data;
}
exports.login = login;
async function authFetch(path, init = {}) {
    const token = getToken();
    const headers = {};
    if (init.body !== undefined)
        headers['Content-Type'] = 'application/json';
    if (token)
        headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: { ...headers, ...init.headers },
    });
    return res;
}
async function fetchJobs() {
    const res = await authFetch('/jobs');
    if (!res.ok)
        throw new Error(`Failed to load jobs (${res.status})`);
    return res.json();
}
exports.fetchJobs = fetchJobs;
async function fetchJob(id) {
    const res = await authFetch(`/jobs/${id}`);
    if (!res.ok)
        throw new Error(`Failed to load job (${res.status})`);
    return res.json();
}
exports.fetchJob = fetchJob;
async function fetchWorkstations() {
    const res = await authFetch('/workstations');
    if (!res.ok)
        throw new Error(`Failed to load workstations (${res.status})`);
    return res.json();
}
exports.fetchWorkstations = fetchWorkstations;
async function createJob(params) {
    const res = await authFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify(params),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to create job (${res.status})`);
    }
    return res.json();
}
exports.createJob = createJob;
async function startJob(id) {
    const res = await authFetch(`/jobs/${id}/start`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to start job (${res.status})`);
    }
}
exports.startJob = startJob;
async function resumeJob(id) {
    const res = await authFetch(`/jobs/${id}/resume`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to resume job (${res.status})`);
    }
}
exports.resumeJob = resumeJob;
async function reopenJob(id) {
    const res = await authFetch(`/jobs/${id}/reopen`, { method: 'POST' });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to reopen job (${res.status})`);
    }
}
exports.reopenJob = reopenJob;
async function updateJob(id, params) {
    const res = await authFetch(`/jobs/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(params),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to update job (${res.status})`);
    }
}
exports.updateJob = updateJob;
async function fetchNotes(jobId) {
    const res = await authFetch(`/notes?jobId=${encodeURIComponent(jobId)}`);
    if (!res.ok)
        throw new Error(`Failed to load notes (${res.status})`);
    return res.json();
}
exports.fetchNotes = fetchNotes;
async function postNote(jobId, body) {
    const res = await authFetch('/notes', {
        method: 'POST',
        body: JSON.stringify({ jobId, body }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `Failed to post note (${res.status})`);
    }
    return res.json();
}
exports.postNote = postNote;
/** Dispatch a job selection event across all widgets */
function selectJob(jobId, jobTitle) {
    window.dispatchEvent(new CustomEvent('clark:job-selected', { detail: { jobId, jobTitle } }));
}
exports.selectJob = selectJob;
/** Dispatch a job list refresh event (e.g. after create or status change) */
function notifyJobListChanged() {
    window.dispatchEvent(new CustomEvent('clark:jobs-changed'));
}
exports.notifyJobListChanged = notifyJobListChanged;
