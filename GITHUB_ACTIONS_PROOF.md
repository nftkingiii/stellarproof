# GitHub Actions Proof Generation

Local Windows can build the Soroban contract, but RISC Zero 3.0's default prover uses Unix APIs. Use the Ubuntu GitHub Actions workflow as the Linux proof machine.

## How to run it

1. Create a GitHub repository using the `stellarproof` folder as the repository root.
2. Push the contents of `stellarproof` to GitHub. The workflow file must live at `.github/workflows/stellarproof-linux.yml` in the GitHub repo.
3. Open the repository on GitHub.
4. Go to `Actions`.
5. Select `StellarProof Linux Build`.
6. Click `Run workflow`.

The workflow will:

- install Linux build dependencies
- install Rust
- install RISC Zero with `rzup`
- install the `risc0-groth16` component
- run `npm test`
- run the Soroban attestor tests
- build `stellarproof_attestor.wasm`
- run `cargo run -p stellarproof-host --release`
- upload `proof.txt`
- upload the attestor Wasm

## Outputs

Download these from the completed workflow run's artifacts:

- `stellarproof-proof/proof.txt`
- `stellarproof-attestor-wasm/stellarproof_attestor.wasm`

`proof.txt` contains four hex lines:

1. RISC Zero Groth16 seal
2. RISC Zero image ID
3. journal digest
4. journal bytes

Those are the values needed by the Stellar verifier-router integration.
