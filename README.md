# StellarProof

StellarProof is a hackathon prototype for verifiable off-chain invoice eligibility on Stellar.

The app proves that a private invoice portfolio passed a deterministic risk policy without
publishing the invoice-level data. RISC Zero proves the off-chain Rust computation; a
Stellar/Soroban contract verifies the proof receipt and records the public attestation.

## Why this fits Stellar Hacks: Real-World ZK

- Real-world use case: invoice factoring and working-capital underwriting.
- ZK is load-bearing: the proof certifies that the risk score was computed correctly.
- Stellar is load-bearing: the final eligibility attestation is designed to be verified and
  stored by a Soroban contract on testnet.
- RISC Zero is a natural fit because the policy is ordinary Rust code rather than a hand-written
  arithmetic circuit.

## Demo flow

1. A business enters private invoice data.
2. The off-chain prover computes:
   - weighted risk score
   - eligible / not eligible
   - invoice portfolio commitment
3. The public journal contains only:
   - applicant account
   - invoice count
   - total invoice value
   - risk score
   - eligibility result
   - input commitment
4. The Stellar contract verifies the RISC Zero receipt and records the attestation.

This workspace includes a runnable local simulation so the product story can be demoed even
before the RISC Zero and Stellar toolchains are installed.

## Run the local demo

```bash
npm run demo
```

Open the browser demo directly:

```text
app/index.html
```

The local demo uses SHA-256 commitments and deterministic mock receipt IDs. It does not claim to
be a cryptographic proof. The real proof boundary is represented in `risc0/` and the real Stellar
attestation boundary is represented in `contracts/`.

## Project layout

```text
app/                                  Browser demo with no build step
contracts/stellarproof_attestor/         Soroban contract skeleton
risc0/guest/                           RISC Zero guest program skeleton
risc0/host/                            RISC Zero host/prover skeleton
scripts/demo.js                        Runnable local proof-flow simulation
```

## Real implementation plan

1. Finish the RISC Zero guest program in `risc0/guest`.
2. Generate a Groth16-compatible RISC Zero receipt from the host in `risc0/host`.
3. Deploy the Nethermind Stellar RISC Zero verifier stack or use an already deployed verifier.
4. Update `StellarProofAttestor::submit_attestation` to call the verifier router.
5. Submit proof seal, image ID, and journal to the contract on Stellar testnet.
6. Demo a valid proof being accepted and a tampered journal being rejected.

## Hackathon submission checklist

- Public repo with this README.
- 2-3 minute demo video.
- Demo shows proof generation, Stellar submission, and attestation lookup.
- README explains which parts are production proof code and which parts are prototype simulation.

## References

- Stellar ZK docs: https://developers.stellar.org/docs/build/apps/zk
- RISC Zero zkVM docs: https://dev.risczero.com/api/zkvm/
- Stellar RISC Zero verifier: https://github.com/NethermindEth/stellar-risc0-verifier

## Real Build Path

The production path is no longer the browser mock. It is:

1. Build the Soroban attestor contract.
2. Generate a RISC Zero Groth16 proof from the guest program.
3. Submit `seal`, `journal_bytes`, and the decoded `PublicJournal` to the attestor.
4. The attestor hashes `journal_bytes`, calls the RISC Zero verifier router with
   `verify(seal, image_id, journal_digest)`, and stores the attestation only after
   verification succeeds.

### Contract build/test

```bash
cargo test -p stellarproof-attestor
stellar contract build --manifest-path contracts/stellarproof_attestor/Cargo.toml
```

### RISC Zero proof artifact

The host writes `proof.txt` with four hex lines:

1. `seal`
2. `image_id`
3. `journal_digest`
4. `journal_bytes`

Those values match the Stellar verifier interface documented by Nethermind's verifier repo.

### Submit to Stellar

After deploying the verifier router and `stellarproof_attestor`, submit with:

```powershell
./scripts/submit-attestation.ps1 \
  -Network testnet \
  -Source <stellar_identity> \
  -AttestorId <attestor_contract_id> \
  -JournalXdr <public_journal_xdr> \
  -ProofFile proof.txt
```

## Linux Proof Generation Without Local WSL

If WSL is blocked, use GitHub Actions as the Linux proof generator. See `GITHUB_ACTIONS_PROOF.md`.
The workflow is `.github/workflows/stellarproof-linux.yml`.
