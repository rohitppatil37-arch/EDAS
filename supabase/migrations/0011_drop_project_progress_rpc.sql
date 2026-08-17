-- Reverting the target-based project progress experiment (0009/0010) entirely.
-- The homepage project-progress display now reuses the existing
-- machine_earthwork_progress RPC (same one ProgressDashboardPage already calls)
-- instead of a dedicated function, so no extra schema/RPC surface is needed for it.
drop function if exists project_progress(uuid[]);
