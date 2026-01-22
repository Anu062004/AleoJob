// Reputation Program
// Manages private reputation scores for Job Seekers and Job Givers
// Privacy: Reputation changes are private, only final score is derived publicly (if needed)

program reputation.aleo {
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
        return JobSeekerReputation {
            owner: current_reputation.owner,
            score: current_reputation.score,
            jobs_completed: current_reputation.jobs_completed + 1u64,
        };
    }

    // Transition: Update reputation after successful job posting/completion
    transition update_job_giver_reputation(
        current_reputation: JobGiverReputation,
        increment_completed: u64, // 1u64 if success, 0u64 if not
    ) -> JobGiverReputation {
        return JobGiverReputation {
            owner: current_reputation.owner,
            score: current_reputation.score,
            jobs_posted: current_reputation.jobs_posted + 1u64,
            jobs_completed: current_reputation.jobs_completed + increment_completed,
        };
    }

    // Function: Get reputation score (read-only)
    // Note: Functions can't take records, so we just return a placeholder
    function get_score(
        score: u64,
    ) -> u64 {
        return score;
    }

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }
}

