#![cfg(test)]

use super::*;
use risc0_interface::{Receipt, RiscZeroVerifierRouterInterface, VerifierEntry, VerifierError};
use soroban_sdk::{contract, contractimpl, testutils::Address as _};

#[contract]
struct MockRouter;

#[contractimpl]
impl RiscZeroVerifierRouterInterface for MockRouter {
    fn verify(
        env: Env,
        seal: Bytes,
        image_id: BytesN<32>,
        journal: BytesN<32>,
    ) -> Result<(), VerifierError> {
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "seal"), &seal);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "image"), &image_id);
        env.storage()
            .instance()
            .set(&Symbol::new(&env, "journal"), &journal);
        Ok(())
    }

    fn verify_integrity(_env: Env, _receipt: Receipt) -> Result<(), VerifierError> {
        Ok(())
    }

    fn verifiers(_env: Env, _selector: BytesN<4>) -> Option<VerifierEntry> {
        None
    }

    fn get_verifier_by_selector(_env: Env, _selector: BytesN<4>) -> Result<Address, VerifierError> {
        Err(VerifierError::SelectorUnknown)
    }

    fn get_verifier_from_seal(_env: Env, _seal: Bytes) -> Result<Address, VerifierError> {
        Err(VerifierError::SelectorUnknown)
    }
}

#[test]
fn submit_attestation_verifies_and_stores_public_journal() {
    let env = Env::default();
    let router_id = env.register(MockRouter, ());
    let contract_id = env.register(StellarProofAttestor, ());
    let client = StellarProofAttestorClient::new(&env, &contract_id);

    let image_id = BytesN::from_array(&env, &[7; 32]);
    client.init(&router_id, &image_id);

    let applicant = Address::generate(&env);
    let journal = PublicJournal {
        applicant: applicant.clone(),
        invoice_count: 3,
        total_value_usd: 52_500,
        weighted_score: 54,
        eligible: true,
        input_commitment: BytesN::from_array(&env, &[9; 32]),
    };
    let journal_bytes = Bytes::from_array(&env, b"stellarproof-public-journal-v1");
    let seal = Bytes::from_array(&env, &[1, 2, 3, 4, 5, 6]);

    let attestation_id = client.submit_attestation(&journal, &journal_bytes, &seal);
    assert_eq!(client.get_attestation(&attestation_id), Some(journal));

    let expected_digest = env.crypto().sha256(&journal_bytes).to_bytes();
    let recorded_digest: BytesN<32> = env.as_contract(&router_id, || {
        env.storage()
            .instance()
            .get(&Symbol::new(&env, "journal"))
            .unwrap()
    });
    assert_eq!(recorded_digest, expected_digest);
}
