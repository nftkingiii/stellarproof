#![no_std]

#[cfg(test)]
mod test;

use risc0_interface::RiscZeroVerifierRouterClient;
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, Address, Bytes, BytesN,
    Env, Symbol,
};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PublicJournal {
    pub applicant: Address,
    pub invoice_count: u32,
    pub total_value_usd: u64,
    pub weighted_score: u32,
    pub eligible: bool,
    pub input_commitment: BytesN<32>,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Router,
    ImageId,
    Attestation(BytesN<32>),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum StellarProofError {
    AlreadyInitialized = 1,
    NotEligible = 2,
}

#[contract]
pub struct StellarProofAttestor;

#[contractimpl]
impl StellarProofAttestor {
    pub fn init(env: Env, router: Address, image_id: BytesN<32>) {
        if env.storage().instance().has(&DataKey::Router) {
            panic_with_error!(&env, StellarProofError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Router, &router);
        env.storage().instance().set(&DataKey::ImageId, &image_id);
    }

    pub fn submit_attestation(
        env: Env,
        journal: PublicJournal,
        journal_bytes: Bytes,
        seal: Bytes,
    ) -> BytesN<32> {
        if !journal.eligible {
            panic_with_error!(&env, StellarProofError::NotEligible);
        }

        let router: Address = env.storage().instance().get(&DataKey::Router).unwrap();
        let image_id: BytesN<32> = env.storage().instance().get(&DataKey::ImageId).unwrap();
        let journal_digest = env.crypto().sha256(&journal_bytes).to_bytes();

        let verifier = RiscZeroVerifierRouterClient::new(&env, &router);
        verifier.verify(&seal, &image_id, &journal_digest);

        let attestation_id = env.crypto().sha256(&journal_bytes).to_bytes();
        env.storage()
            .persistent()
            .set(&DataKey::Attestation(attestation_id.clone()), &journal);
        env.events().publish(
            (Symbol::new(&env, "attested"), journal.applicant.clone()),
            attestation_id.clone(),
        );
        attestation_id
    }

    pub fn get_attestation(env: Env, attestation_id: BytesN<32>) -> Option<PublicJournal> {
        env.storage()
            .persistent()
            .get(&DataKey::Attestation(attestation_id))
    }
}
