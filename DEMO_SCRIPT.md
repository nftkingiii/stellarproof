# StellarProof Demo Script

Target length: 2-3 minutes.

## 0:00 - Problem

Invoice financing requires private business data. A business wants to prove it passed an
underwriting policy without publishing every invoice, debtor rating, and aging detail.

## 0:25 - What StellarProof Does

StellarProof computes the underwriting decision off-chain, proves the computation with RISC Zero,
and submits the public result to Stellar. The public result is small: total value, score,
eligibility, and a commitment to the private input data.

## 0:55 - Demo

1. Open `app/index.html`.
2. Show the private invoice values.
3. Click `Generate proof`.
4. Show:
   - eligibility result
   - total invoice value
   - weighted risk score
   - input commitment
   - mock RISC Zero receipt
   - mock Stellar attestation

## 1:40 - Architecture

Show the repo:

- `risc0/guest`: Rust policy that runs inside the zkVM.
- `risc0/host`: prover that creates a RISC Zero receipt.
- `contracts/stellarproof_attestor`: Soroban contract boundary for verifier-router integration.
- `scripts/demo.js`: local deterministic simulation used for the prototype demo.

## 2:15 - Next Step

Replace the local mock receipt with a real RISC Zero Groth16 receipt, call the Stellar RISC Zero
verifier router from the Soroban contract, and deploy the attestor on Stellar testnet.
