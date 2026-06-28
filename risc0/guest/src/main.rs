use risc0_zkvm::guest::env;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Deserialize, Serialize)]
struct Invoice {
    id: String,
    amount_usd: u64,
    age_days: u32,
    debtor_rating: u32,
}

#[derive(Deserialize, Serialize)]
struct Portfolio {
    applicant: String,
    invoices: Vec<Invoice>,
}

#[derive(Serialize)]
struct PublicJournal {
    applicant: String,
    invoice_count: u32,
    total_value_usd: u64,
    weighted_score: u32,
    eligible: bool,
    input_commitment: [u8; 32],
}

fn score_invoice(invoice: &Invoice) -> u32 {
    let age_penalty = ((invoice.age_days as f64) * 0.7).min(35.0);
    let debtor_bonus = (invoice.debtor_rating as f64) * 0.85;
    let size_penalty = if invoice.amount_usd > 20_000 { 4.0 } else { 0.0 };
    (debtor_bonus - age_penalty - size_penalty).max(0.0).round() as u32
}

fn main() {
    let portfolio: Portfolio = env::read();
    let encoded = serde_json::to_vec(&portfolio).expect("portfolio serializes");
    let input_commitment: [u8; 32] = Sha256::digest(encoded).into();

    let total_value_usd: u64 = portfolio.invoices.iter().map(|invoice| invoice.amount_usd).sum();
    let weighted_points: u64 = portfolio
        .invoices
        .iter()
        .map(|invoice| score_invoice(invoice) as u64 * invoice.amount_usd)
        .sum();

    let weighted_score = if total_value_usd == 0 {
        0
    } else {
        (weighted_points / total_value_usd) as u32
    };

    let journal = PublicJournal {
        applicant: portfolio.applicant,
        invoice_count: portfolio.invoices.len() as u32,
        total_value_usd,
        weighted_score,
        eligible: weighted_score >= 50 && total_value_usd >= 25_000,
        input_commitment,
    };

    env::commit(&journal);
}
