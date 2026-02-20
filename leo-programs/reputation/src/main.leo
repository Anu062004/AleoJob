// Reputation Program
// Manages private reputation scores for Job Seekers and Job Givers
// Privacy: Reputation changes are private, only final score is derived publicly (if needed)

program reputation_v3.aleo {
    
    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }

    // Reputation Record for Job Seeker
    record JobSeekerReputation {
        owner: address,
        score: u64, // 0-100
        jobs_completed: u64,
    }

    // Reputation Record for Job Giver
    record JobGiverReputation {
        owner: address,
        score: u64, // 0-100
        jobs_posted: u64,
        jobs_completed: u64,
    }

    // Transition: Update reputation after job completion
    transition update_job_seeker_reputation(
        current_reputation: JobSeekerReputation,
        feedback_score: u64, // 0-10
    ) -> JobSeekerReputation {
        assert(feedback_score <= 10u64);
        let next_jobs_completed: u64 = current_reputation.jobs_completed + 1u64;
        let weighted_feedback: u64 = feedback_score * 10u64;
        let weighted_total: u64 = current_reputation.score * current_reputation.jobs_completed + weighted_feedback;
        let next_score: u64 = weighted_total / next_jobs_completed;
        return JobSeekerReputation {
            owner: current_reputation.owner,
            score: next_score,
            jobs_completed: next_jobs_completed,
        };
    }

    // Transition: Update reputation after successful job posting/completion
    transition update_job_giver_reputation(
        current_reputation: JobGiverReputation,
        increment_completed: u64, // 1u64 if success, 0u64 if not
    ) -> JobGiverReputation {
        assert(increment_completed <= 1u64);
        let next_jobs_posted: u64 = current_reputation.jobs_posted + 1u64;
        let next_jobs_completed: u64 = current_reputation.jobs_completed + increment_completed;
        let next_score: u64 = (next_jobs_completed * 100u64) / next_jobs_posted;
        return JobGiverReputation {
            owner: current_reputation.owner,
            score: next_score,
            jobs_posted: next_jobs_posted,
            jobs_completed: next_jobs_completed,
        };
    }

    // Function: Get reputation score (read-only)
    // Note: Functions can't take records, so we just return a placeholder
    function get_score(
        score: u64,
    ) -> u64 {
        return score;
    }
}
