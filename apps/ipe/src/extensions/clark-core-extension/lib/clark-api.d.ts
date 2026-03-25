export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    actorId: string;
    displayName: string;
}
export interface Job {
    id: string;
    title: string;
    status: string;
    facility_id: string;
    workstation_id: string;
    job_type: string;
    priority: string;
    human_ref: string | null;
    created_at: string;
}
export interface JobDetail extends Job {
    zone_id: string;
    description: string | null;
    current_owner_actor_id: string | null;
    updated_at: string;
}
export interface Note {
    id: string;
    body: string;
    author_actor_id: string;
    created_at: string;
}
export interface Workstation {
    id: string;
    name: string;
    facility_id: string;
    zone_id: string;
    station_type: string;
    status: string;
}
export interface CreateJobParams {
    title: string;
    facilityId: string;
    zoneId: string;
    workstationId: string;
    description?: string;
    jobType?: string;
    priority?: string;
    humanRef?: string;
}
export interface UpdateJobParams {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
}
export declare function getToken(): string | null;
export declare function getActorId(): string | null;
export declare function clearSession(): void;
export declare function login(username: string, password: string): Promise<LoginResult>;
export declare function fetchJobs(): Promise<Job[]>;
export declare function fetchJob(id: string): Promise<JobDetail>;
export declare function fetchWorkstations(): Promise<Workstation[]>;
export declare function createJob(params: CreateJobParams): Promise<{
    id: string;
    title: string;
    status: string;
}>;
export declare function startJob(id: string): Promise<void>;
export declare function resumeJob(id: string): Promise<void>;
export declare function reopenJob(id: string): Promise<void>;
export declare function updateJob(id: string, params: UpdateJobParams): Promise<void>;
export declare function fetchNotes(jobId: string): Promise<Note[]>;
export declare function postNote(jobId: string, body: string): Promise<Note>;
/** Dispatch a job selection event across all widgets */
export declare function selectJob(jobId: string, jobTitle: string): void;
/** Dispatch a job list refresh event (e.g. after create or status change) */
export declare function notifyJobListChanged(): void;
