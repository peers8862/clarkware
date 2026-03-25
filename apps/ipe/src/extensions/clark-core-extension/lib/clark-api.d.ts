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
export declare function getToken(): string | null;
export declare function getActorId(): string | null;
export declare function clearSession(): void;
export declare function login(username: string, password: string): Promise<LoginResult>;
export declare function fetchJobs(): Promise<Job[]>;
export declare function fetchJob(id: string): Promise<JobDetail>;
export declare function fetchNotes(jobId: string): Promise<Note[]>;
export declare function postNote(jobId: string, body: string): Promise<Note>;
/** Dispatch a job selection event across all widgets */
export declare function selectJob(jobId: string, jobTitle: string): void;
