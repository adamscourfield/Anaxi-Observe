"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ImportJob {
  id: string;
  type: string;
  status: string;
  fileName: string | null;
  rowCount: number;
  rowsProcessed: number;
  rowsFailed: number;
  errorSummary: string | null;
  createdAt: string;
}

export function ImportJobHistory() {
  const [jobs, setJobs] = useState<ImportJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/import/jobs")
      .then((r) => r.json())
      .then((data) => {
        setJobs(data.jobs ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted">Loading…</p>;

  if (jobs.length === 0) {
    return <p className="text-sm text-muted">No import jobs yet.</p>;
  }

  return (
    <table className="w-full border border-border bg-surface text-sm">
      <thead>
        <tr className="border-b border-border">
          <th className="p-2 text-left text-text">Date</th>
          <th className="p-2 text-left text-text">Type</th>
          <th className="p-2 text-center text-text">Status</th>
          <th className="p-2 text-center text-text">Processed</th>
          <th className="p-2 text-center text-text">Failed</th>
          <th className="p-2 text-left text-text">Actions</th>
        </tr>
      </thead>
      <tbody>
        {jobs.map((job) => (
          <tr key={job.id} className="border-b border-border">
            <td className="p-2 text-text">{new Date(job.createdAt).toLocaleDateString()}</td>
            <td className="p-2 text-text">{job.type}</td>
            <td className="p-2 text-center">
              <span
                className={
                  job.status === "COMPLETED" || job.status === "SUCCESS"
                    ? "font-medium text-green-700"
                    : job.status === "FAILED"
                    ? "font-medium text-red-700"
                    : "text-muted"
                }
              >
                {job.status}
              </span>
            </td>
            <td className="p-2 text-center text-text">{job.rowsProcessed ?? job.rowCount}</td>
            <td className="p-2 text-center text-text">
              {job.rowsFailed > 0 ? (
                <span className="text-red-600">{job.rowsFailed}</span>
              ) : (
                "0"
              )}
            </td>
            <td className="p-2 flex gap-2">
              <Link href={`/tenant/behaviour/import/job/${job.id}`} className="text-xs underline text-text">
                View report
              </Link>
              {job.rowsFailed > 0 && (
                <a
                  href={`/api/import/jobs/${job.id}/errors.csv`}
                  download
                  className="text-xs underline text-red-600"
                >
                  Download errors
                </a>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
