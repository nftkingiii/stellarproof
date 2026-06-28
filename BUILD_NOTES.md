# Build Notes

## Verified locally

This workspace uses an isolated Rust install under `../work` so it does not depend on the user's global Rust profile.

```powershell
$env:RUSTUP_HOME='C:/Users/HP/Documents/Codex/2026-06-27/c/work/rustup'
$env:CARGO_HOME='C:/Users/HP/Documents/Codex/2026-06-27/c/work/cargo'
$env:Path='C:/Users/HP/Documents/Codex/2026-06-27/c/work/cargo/bin;' + $env:Path
cargo +stable-x86_64-pc-windows-gnu test -p stellarproof-attestor
npm test
```

Both commands pass.

## Remaining proof-generation requirement

`cargo check -p stellarproof-host` reaches the RISC Zero dependency graph but fails on this Windows machine because `ring` needs a native C compiler:

```text
failed to find tool "gcc.exe": program not found
```

To finish proof generation on this machine, install one of:

- Visual Studio Build Tools with C++ workload and use the MSVC Rust toolchain.
- A working MinGW/GCC toolchain on PATH and use `stable-x86_64-pc-windows-gnu`.
- A WSL Linux distro, then install Rust/RISC Zero inside WSL.

RISC Zero's own docs recommend `rzup` primarily for x86-64 Linux and arm64 macOS. For this project, the fastest reliable path is WSL Ubuntu or an x86-64 Linux runner for Groth16 proof generation.

## Windows test/build note

`contracts/stellarproof_attestor/Cargo.toml` is committed with:

```toml
crate-type = ["cdylib", "rlib"]
```

That is the correct shape for producing `target/wasm32v1-none/release/stellarproof_attestor.wasm`.

On this Windows GNU toolchain, `cargo test -p stellarproof-attestor` can fail while linking the host-side `cdylib` test DLL with:

```text
export ordinal too large
```

The contract unit test was verified by temporarily using `crate-type = ["lib"]`, then the deployable `cdylib` setting was restored and the Wasm contract build was verified.
