# StellarProof Testnet Deployment

Network: Stellar testnet

## Deployer

- CLI identity alias: `stellarproof`
- Public account: `GCLYNNQAALEZZSSFPNWRHWDNEPUB7NYLX6EKDUWOSE2SFEG2NYNT4YIH`

## RISC Zero Verifier Stack

- Timelock controller: `CD5KZDDHPNHLYS3M3QNJPV3OFZL7BOPKJ2YMIJPCWXNL7WMUK2N6RZVL`
- Verifier router: `CCUUSMLUDFY7VRC3WEKBGXMID7BJRVHZUFBTYGGIHSQCHUEKQWA7U3ET`
- RISC Zero Groth16 selector: `73c457ba`

Router deployment completed through Nethermind's `stellar-risc0-verifier` scripts.

## StellarProof Attestor

- Attestor contract: `CBCNE2TG4G25ZYS3YNTTRBXQRVCLOYEGKGWB4YACBT4H2XUSSDBVZ7IY`
- Deploy transaction: https://stellar.expert/explorer/testnet/tx/d08a901f6051569fec73c70eca5a5cf8f5aa896717996b2a9deb20de4bc0efa2
- Init transaction: https://stellar.expert/explorer/testnet/tx/d8e4104663d8611a81ac7b2806a6042cb3a90544fe26f3e4c614207289f11199
- Initialized router: `CCUUSMLUDFY7VRC3WEKBGXMID7BJRVHZUFBTYGGIHSQCHUEKQWA7U3ET`
- Initialized image ID: `496d8915abb5a792baf842a5dfcc5df143e4cad5ad8469397eea0a15c8b91f3c`

## Remaining On-Chain Step

Register the deployed Groth16 verifier with the router for selector `73c457ba`.

From the sibling Nethermind verifier repo:

```bash
cd /c/Users/HP/Documents/Codex/2026-06-27/c/stellar-risc0-verifier
./scripts/manage.sh deploy-verifier -n testnet -a stellarproof
./scripts/manage.sh schedule-add-verifier -n testnet -a stellarproof --selector 73c457ba
./scripts/manage.sh execute-add-verifier -n testnet -a stellarproof --selector 73c457ba
./scripts/manage.sh status -n testnet
```

After `status` reports selector `73c457ba` as active, proof submission can call `StellarProofAttestor.submit_attestation`, which calls the router's `verify(seal, image_id, journal_digest)` before storing the public journal.
