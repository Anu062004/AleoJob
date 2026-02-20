// Escrow Program v4 (reimplemented)
// Goals:
// - Keep transition interface compatible with existing frontend/backend calls.
// - Enforce strict lock/release/refund invariants on-chain.
// - Ensure release/refund only spend locked escrow state once.

import credits.aleo;

program escrow_v4.aleo {

    @noupgrade
    async constructor() {
        // Compiler-generated constructor logic.
    }

    // Canonical escrow state record.
    // status: 0 = locked, 1 = released, 2 = refunded
    record PaymentEscrow {
        owner: address,
        payer: address,
        payee: address,
        amount: u64,
        job_id: field,
        status: u8,
    }

    // Optional proof record submitted by seeker.
    record WorkProof {
        owner: address,
        seeker: address,
        job_id: field,
        proof_hash: field,
        status: u8,
    }

    // Lock escrow for a known payee.
    async transition create_escrow(
        owner: address,
        payer: address,
        payee: address,
        amount: u64,
        job_id: field,
        funding: credits.aleo/credits,
    ) -> (PaymentEscrow, credits.aleo/credits, Future) {
        assert(self.caller == payer);
        assert(owner == payer);
        assert(payee != payer);
        assert(job_id != 0field);
        assert(amount > 0u64);
        assert(funding.owner == payer);
        assert(funding.microcredits >= amount);

        let escrow: PaymentEscrow = PaymentEscrow {
            owner: payer,
            payer: payer,
            payee: payee,
            amount: amount,
            job_id: job_id,
            status: 0u8,
        };

        let lock_transfer: (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            funding,
            self.address,
            amount,
        );

        return (escrow, lock_transfer.0, await_transfer(lock_transfer.1));
    }

    // Lock escrow before seeker assignment.
    // payee == payer indicates "unassigned" while locked.
    async transition create_job_escrow(
        owner: address,
        payer: address,
        amount: u64,
        job_id: field,
        funding: credits.aleo/credits,
    ) -> (PaymentEscrow, credits.aleo/credits, Future) {
        assert(self.caller == payer);
        assert(owner == payer);
        assert(job_id != 0field);
        assert(amount > 0u64);
        assert(funding.owner == payer);
        assert(funding.microcredits >= amount);

        let escrow: PaymentEscrow = PaymentEscrow {
            owner: payer,
            payer: payer,
            payee: payer,
            amount: amount,
            job_id: job_id,
            status: 0u8,
        };

        let lock_transfer: (credits.aleo/credits, Future) = credits.aleo/transfer_private_to_public(
            funding,
            self.address,
            amount,
        );

        return (escrow, lock_transfer.0, await_transfer(lock_transfer.1));
    }

    transition submit_work_proof(
        owner: address,
        job_id: field,
        proof_hash: field,
    ) -> WorkProof {
        assert(self.caller == owner);
        assert(job_id != 0field);
        assert(proof_hash != 0field);

        return WorkProof {
            owner: owner,
            seeker: owner,
            job_id: job_id,
            proof_hash: proof_hash,
            status: 0u8,
        };
    }

    // Release locked escrow to seeker.
    async transition release_payment(
        escrow: PaymentEscrow,
        payee: address,
        completion_proof: field,
    ) -> (PaymentEscrow, credits.aleo/credits, Future) {
        assert(self.caller == escrow.owner);
        assert(escrow.owner == escrow.payer);
        assert(escrow.status == 0u8);
        assert(escrow.amount > 0u64);
        assert(escrow.job_id != 0field);
        assert(payee != escrow.payer);
        assert(completion_proof != 0field);

        // If payee was already assigned at lock time, enforce it.
        assert(escrow.payee == escrow.payer || payee == escrow.payee);

        let released_escrow: PaymentEscrow = PaymentEscrow {
            owner: payee,
            payer: escrow.payer,
            payee: payee,
            amount: escrow.amount,
            job_id: escrow.job_id,
            status: 1u8,
        };

        let payout: (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            payee,
            escrow.amount,
        );

        return (released_escrow, payout.0, await_transfer(payout.1));
    }

    // Refund locked escrow back to payer.
    async transition refund_payment(
        escrow: PaymentEscrow,
        refund_reason: u8,
    ) -> (PaymentEscrow, credits.aleo/credits, Future) {
        assert(self.caller == escrow.owner);
        assert(escrow.owner == escrow.payer);
        assert(escrow.status == 0u8);
        assert(escrow.amount > 0u64);
        assert(escrow.job_id != 0field);
        assert(refund_reason <= 1u8);

        let refunded_escrow: PaymentEscrow = PaymentEscrow {
            owner: escrow.payer,
            payer: escrow.payer,
            payee: escrow.payee,
            amount: escrow.amount,
            job_id: escrow.job_id,
            status: 2u8,
        };

        let refund: (credits.aleo/credits, Future) = credits.aleo/transfer_public_to_private(
            escrow.payer,
            escrow.amount,
        );

        return (refunded_escrow, refund.0, await_transfer(refund.1));
    }

    async function await_transfer(f: Future) {
        f.await();
    }

    function get_status(status: u8) -> u8 {
        return status;
    }
}
