# StellarProof Testnet Deployment

Network: Stellar testnet

## Deployer

- CLI identity alias: `stellarproof`
- Public account: `GCLYNNQAALEZZSSFPNWRHWDNEPUB7NYLX6EKDUWOSE2SFEG2NYNT4YIH`

## RISC Zero Verifier Stack

- Timelock controller: `CD5KZDDHPNHLYS3M3QNJPV3OFZL7BOPKJ2YMIJPCWXNL7WMUK2N6RZVL`
- Verifier router: `CCUUSMLUDFY7VRC3WEKBGXMID7BJRVHZUFBTYGGIHSQCHUEKQWA7U3ET`
- Groth16 verifier: `CBTDE573YDNCYZQSM2QXOUKKZSR4H7KMMUYEID6OVP7DAIW6T6PKAKGD`
- Emergency-stop wrapper: `CC6TBSFX3YSVB4HG2MITTMWDO3XWMRDX5FCFBWTKSIEIPHGCRSCHZ645`
- RISC Zero Groth16 selector: `73c457ba`
- Router entry: `{"Active":"CC6TBSFX3YSVB4HG2MITTMWDO3XWMRDX5FCFBWTKSIEIPHGCRSCHZ645"}`

Router deployment completed through Nethermind's `stellar-risc0-verifier` scripts. The Groth16 verifier was wrapped by the emergency-stop contract and registered in the router for selector `73c457ba`.

## StellarProof Attestor

- Attestor contract: `CBCNE2TG4G25ZYS3YNTTRBXQRVCLOYEGKGWB4YACBT4H2XUSSDBVZ7IY`
- Deploy transaction: https://stellar.expert/explorer/testnet/tx/d08a901f6051569fec73c70eca5a5cf8f5aa896717996b2a9deb20de4bc0efa2
- Init transaction: https://stellar.expert/explorer/testnet/tx/d8e4104663d8611a81ac7b2806a6042cb3a90544fe26f3e4c614207289f11199
- Initialized router: `CCUUSMLUDFY7VRC3WEKBGXMID7BJRVHZUFBTYGGIHSQCHUEKQWA7U3ET`
- Initialized image ID: `496d8915abb5a792baf842a5dfcc5df143e4cad5ad8469397eea0a15c8b91f3c`

## Final Proof Attestation

- Attestation transaction: https://stellar.expert/explorer/testnet/tx/3acb3541d8942f626f4a3de88e5c1ea9f11e93ec7e461912716e3fe22b3b25c4
- Attestation ID / journal digest: `ea722924c01e94f1670010599a3b96e94f063e403a851987494b9a66ac6d44a6`
- Event: `attested`
- Applicant: `GCLYNNQAALEZZSSFPNWRHWDNEPUB7NYLX6EKDUWOSE2SFEG2NYNT4YIH`

The submitted proof used the latest GitHub Actions RISC Zero Groth16 artifact from `app/proofs/latest-proof.json` and was accepted by `StellarProofAttestor.submit_attestation` on Stellar testnet.

## Verification Check

The router was queried directly:

```bash
stellar contract invoke --network testnet --source stellarproof --id CCUUSMLUDFY7VRC3WEKBGXMID7BJRVHZUFBTYGGIHSQCHUEKQWA7U3ET -- verifiers --selector 73c457ba
```

Result:

```json
{"Active":"CC6TBSFX3YSVB4HG2MITTMWDO3XWMRDX5FCFBWTKSIEIPHGCRSCHZ645"}
```

This means the router dispatch path for RISC Zero Groth16 selector `73c457ba` is live. Proof submission can call `StellarProofAttestor.submit_attestation`, which calls the router's `verify(seal, image_id, journal_digest)` before storing the public journal.

