// Escrow Program
// Manages payment escrow for job completion
// Privacy: Payment amounts are private, only completion proof is public

// Note: Use a longer program name (without \"aleo\" prefix) to reduce namespace fee on deployment.
program job_marketplace_escrow_engine.aleo {
    // Escrow Record (holds payment until job completion)
    record PaymentEscrow {
        owner: address, // Record owner
        payer: address, // Job Giver
        payee: address, // Job Seeker
        amount: u64,
        job_id: field,
        status: u8, // 0 = locked, 1 = released, 2 = refunded
    }

    // Transition: Job Giver locks payment in escrow
    // Privacy: Amount and addresses are private
    transition create_escrow(
        owner: address,
        payer: address,
        payee: address,
        amount: u64,
        job_id: field,
    ) -> PaymentEscrow {
        return PaymentEscrow {
            owner: owner,
            payer: payer,
            payee: payee,
            amount: amount,
            job_id: job_id,
            status: 0u8, // locked
        };
    }

    // Transition: Release payment to Job Seeker (after job completion)
    transition release_payment(
        escrow: PaymentEscrow,
        completion_proof: field, // Proof that job is complete
    ) -> PaymentEscrow {
        return PaymentEscrow {
            owner: escrow.owner,
            payer: escrow.payer,
            payee: escrow.payee,
            amount: escrow.amount,
            job_id: escrow.job_id,
            status: 1u8, // released
        };
    }

    // Transition: Refund payment to Job Giver (on cancellation/dispute)
    transition refund_payment(
        escrow: PaymentEscrow,
        refund_reason: u8, // 0 = cancellation, 1 = dispute
    ) -> PaymentEscrow {
        return PaymentEscrow {
            owner: escrow.owner,
            payer: escrow.payer,
            payee: escrow.payee,
            amount: escrow.amount,
            job_id: escrow.job_id,
            status: 2u8, // refunded
        };
    }

    // Function: Check escrow status (read-only)
    // Note: Functions can't take records
    function get_status(
        status: u8,
    ) -> u8 {
        return status;
    }
}

