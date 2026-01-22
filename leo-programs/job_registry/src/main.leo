// Job Registry Program
// Manages private job postings and applications
// Privacy: Job details are private, only matched candidates can see them

program job_registry.aleo {
    // Job Record (private to Job Giver and matched Job Seekers)
    record JobPosting {
        owner: address, // Job Giver address
        budget_min: u64,
        budget_max: u64,
        deadline_block: u64,
        status: u8, // 0 = open, 1 = in_progress, 2 = completed, 3 = cancelled
    }

    // Application Record (private to Job Seeker and Job Giver)
    record JobApplication {
        owner: address, // Record owner
        applicant: address, // Job Seeker address
        job_id: field, // Reference to job posting
        proposed_budget: u64,
        status: u8, // 0 = pending, 1 = accepted, 2 = rejected
    }

    // Match Record (proves eligibility without revealing all details)
    record JobMatch {
        owner: address, // Record owner
        job_seeker: address,
        job_giver: address,
        job_id: field,
        created_block: u64,
    }

    // Transition: Job Giver posts a new job
    transition create_job(
        owner: address,
        budget_min: u64,
        budget_max: u64,
        deadline_block: u64,
    ) -> JobPosting {
        return JobPosting {
            owner: owner,
            budget_min: budget_min,
            budget_max: budget_max,
            deadline_block: deadline_block,
            status: 0u8, // open
        };
    }

    // Transition: Job Seeker applies to a matched job
    transition apply_to_job(
        owner: address,
        applicant: address,
        job_posting: JobPosting,
        proposed_budget: u64,
    ) -> JobApplication {
        return JobApplication {
            owner: owner,
            applicant: applicant,
            job_id: 0field,
            proposed_budget: proposed_budget,
            status: 0u8, // pending
        };
    }

    // Transition: Job Giver accepts an application
    transition accept_application(
        job_posting: JobPosting,
        application: JobApplication,
    ) -> JobPosting {
        return JobPosting {
            owner: job_posting.owner,
            budget_min: job_posting.budget_min,
            budget_max: job_posting.budget_max,
            deadline_block: job_posting.deadline_block,
            status: 1u8, // in_progress
        };
    }

    // Function: Check if job is still open (read-only)
    // Note: Functions can't take records, so we use individual fields
    function is_job_open(
        status: u8,
        deadline_block: u64,
        current_block: u64,
    ) -> bool {
        return status == 0u8 && current_block <= deadline_block;
    }

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }
}

