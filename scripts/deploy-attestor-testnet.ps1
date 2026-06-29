param(
  [Parameter(Mandatory=$true)] [string] $Source,
  [Parameter(Mandatory=$true)] [string] $RouterId,
  [string] $Network = "testnet",
  [string] $Wasm = "target/wasm32v1-none/release/stellarproof_attestor.wasm",
  [string] $LatestProofJson = "app/proofs/latest-proof.json",
  [string] $ImageId,
  [string] $OutFile = "deployments/testnet.json"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command stellar -ErrorAction SilentlyContinue)) {
  throw "Stellar CLI is not installed or not on PATH. Install it first, then rerun this script."
}

if (-not $ImageId) {
  if (-not (Test-Path -LiteralPath $LatestProofJson)) {
    throw "Missing $LatestProofJson. Pass -ImageId explicitly or run the proof workflow first."
  }
  $latest = Get-Content -Raw -LiteralPath $LatestProofJson | ConvertFrom-Json
  $ImageId = $latest.proof.imageId
}

if (-not $ImageId -or $ImageId.Length -ne 64) {
  throw "ImageId must be a 32-byte hex string. Got '$ImageId'."
}

if (-not (Test-Path -LiteralPath $Wasm)) {
  Write-Host "Attestor Wasm not found at $Wasm; building it now..."
  cargo build -p stellarproof-attestor --target wasm32v1-none --release
}

if (-not (Test-Path -LiteralPath $Wasm)) {
  throw "Attestor Wasm still missing at $Wasm after build."
}

Write-Host "Deploying StellarProofAttestor to $Network..."
$contractId = stellar contract deploy `
  --network $Network `
  --source $Source `
  --wasm $Wasm

$contractId = ($contractId | Select-Object -Last 1).Trim()
if (-not $contractId) {
  throw "stellar contract deploy did not return a contract id."
}

Write-Host "Initializing $contractId with router $RouterId and image id $ImageId..."
stellar contract invoke `
  --network $Network `
  --source $Source `
  --id $contractId `
  -- `
  init `
  --router $RouterId `
  --image_id $ImageId

$outDir = Split-Path -Parent $OutFile
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
  New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$result = [ordered]@{
  network = $Network
  contractId = $contractId
  routerId = $RouterId
  imageId = $ImageId
  source = $Source
  deployedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$result | ConvertTo-Json | Set-Content -LiteralPath $OutFile -Encoding utf8
Write-Host "Wrote $OutFile"
Write-Host "Contract ID: $contractId"
