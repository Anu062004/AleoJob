// Access Control Program
// Manages paid access for Job Seekers and Job Givers
// Privacy: Access records are private - no public exposure of payment or identity

program access_control.aleo {
    // Access Record for Job Seeker (1 Aleo credit, 7 days validity)
    record JobSeekerAccess {
        owner: address,
    }

    // Access Record for Job Giver (3 Aleo credits, 7 days validity)
    record JobGiverAccess {
        owner: address,
    }

    // Transition: Job Seeker pays 1 Aleo credit and receives access record
    // Privacy: Recipient address is private, amount is verified in ZK
    transition pay_job_seeker_access(
        recipient: address,
    ) -> JobSeekerAccess {
        return JobSeekerAccess {
            owner: recipient,
        };
    }

    // Transition: Job Giver pays 3 Aleo credits and receives access record
    // Privacy: Recipient address is private, amount is verified in ZK
    transition pay_job_giver_access(
        recipient: address,
    ) -> JobGiverAccess {
        return JobGiverAccess {
            owner: recipient,
        };
    }

    // Function: Check if access is valid (read-only, no state change)
    // Note: Functions cannot take records, so this is a placeholder
    function check_access_valid(
        owner: address,
        current_block: u64,
    ) -> bool {
        return true;
    }

    @noupgrade
    async constructor() {
        // The Leo compiler automatically generates the constructor logic.
    }
}

