use anyhow::Result;
use stellarproof_methods::{STELLARPROOF_GUEST_ELF, STELLARPROOF_GUEST_ID};
use risc0_ethereum_contracts::encode_seal;
use risc0_zkvm::{default_prover, ExecutorEnv, ProverOpts};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;

#[derive(Serialize)]
struct Invoice {
    id: String,
    amount_usd: u64,
    age_days: u32,
    debtor_rating: u32,
}

#[derive(Serialize)]
struct Portfolio {
    applicant: String,
    invoices: Vec<Invoice>,
}

fn image_id_bytes(words: [u32; 8]) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    for (index, word) in words.iter().enumerate() {
        bytes[index * 4..index * 4 + 4].copy_from_slice(&word.to_le_bytes());
    }
    bytes
}

fn main() -> Result<()> {
    let portfolio = Portfolio {
        applicant: "GDEMO4QPOCINVOICEFACTORING7STELLARTESTNET".to_string(),
        invoices: vec![
            Invoice {
                id: "INV-1042".to_string(),
                amount_usd: 18_000,
                age_days: 18,
                debtor_rating: 91,
            },
            Invoice {
                id: "INV-1048".to_string(),
                amount_usd: 12_500,
                age_days: 27,
                debtor_rating: 84,
            },
            Invoice {
                id: "INV-1051".to_string(),
                amount_usd: 22_000,
                age_days: 34,
                debtor_rating: 88,
            },
        ],
    };

    let env = ExecutorEnv::builder().write(&portfolio)?.build()?;
    let receipt = default_prover()
        .prove_with_opts(env, STELLARPROOF_GUEST_ELF, &ProverOpts::groth16())?
        .receipt;

    let seal = encode_seal(&receipt)?;
    let journal_digest: [u8; 32] = Sha256::digest(receipt.journal.bytes.as_slice()).into();
    let image_id = image_id_bytes(STELLARPROOF_GUEST_ID);

    fs::write(
        "proof.txt",
        format!(
            "{}\n{}\n{}\n{}\n",
            hex::encode(seal),
            hex::encode(image_id),
            hex::encode(journal_digest),
            hex::encode(receipt.journal.bytes)
        ),
    )?;

    println!("wrote proof.txt: seal, image_id, journal_digest, journal_bytes");
    Ok(())
}
