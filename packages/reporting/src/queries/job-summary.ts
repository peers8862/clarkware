import { query } from '@clark/db';
import type { JobId } from '@clark/core';

export interface JobSummary {
  jobId: JobId;
  jobName: string;
  status: string;
  taskTotal: number;
  taskCompleted: number;
  noteCount: number;
  issueCount: number;
  artifactCount: number;
}

export async function getJobSummary(jobId: JobId): Promise<JobSummary | null> {
  const rows = await query<{
    job_id: string;
    job_name: string;
    status: string;
    task_total: string;
    task_completed: string;
    note_count: string;
    issue_count: string;
    artifact_count: string;
  }>(
    `SELECT
       j.id          AS job_id,
       j.name        AS job_name,
       j.status,
       COUNT(DISTINCT t.id)                           AS task_total,
       COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') AS task_completed,
       COUNT(DISTINCT n.id)                           AS note_count,
       COUNT(DISTINCT i.id)                           AS issue_count,
       COUNT(DISTINCT a.id)                           AS artifact_count
     FROM jobs j
     LEFT JOIN tasks     t ON t.job_id = j.id AND t.deleted_at IS NULL
     LEFT JOIN notes     n ON n.job_id = j.id
     LEFT JOIN issues    i ON i.job_id = j.id AND i.deleted_at IS NULL
     LEFT JOIN artifacts a ON a.job_id = j.id
     WHERE j.id = $1 AND j.deleted_at IS NULL
     GROUP BY j.id, j.name, j.status`,
    [jobId],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    jobId: row.job_id as JobId,
    jobName: row.job_name,
    status: row.status,
    taskTotal: Number(row.task_total),
    taskCompleted: Number(row.task_completed),
    noteCount: Number(row.note_count),
    issueCount: Number(row.issue_count),
    artifactCount: Number(row.artifact_count),
  };
}
