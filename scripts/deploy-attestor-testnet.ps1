param(
  [Parameter(Mandatory=$true)] [string] $Source,
  [Parameter(Mandatory=$true)] [string] $RouterId,
  [string] $Network = "testnet",
  [string] $Wasm = "target/wasm32v1-none/release/stellarproof_attestor.wasm",
  [string] $LatestProofJson = "app/proofs/latest-proof.json",
  [string] $ImageId,
  [string] $OutFile = "deployments/testnet.json",
  [string] $ExistingContractId,
  [switch] $SkipInit,
  [int] $DeployAttempts = 4,
  [int] $RetryDelaySeconds = 45
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

$contractId = $ExistingContractId

if (-not $contractId) {
  if (-not (Test-Path -LiteralPath $Wasm)) {
    Write-Host "Attestor Wasm not found at $Wasm; building it now..."
    cargo build -p stellarproof-attestor --target wasm32v1-none --release
  }

  if (-not (Test-Path -LiteralPath $Wasm)) {
    throw "Attestor Wasm still missing at $Wasm after build."
  }

  Write-Host "Deploying StellarProofAttestor to $Network..."
  $deployOutput = $null

  for ($attempt = 1; $attempt -le $DeployAttempts; $attempt++) {
    if ($attempt -gt 1) {
      Write-Host "Waiting $RetryDelaySeconds seconds for Stellar RPC to index the uploaded Wasm before retry $attempt/$DeployAttempts..."
      Start-Sleep -Seconds $RetryDelaySeconds
    }

    try {
      $deployOutput = stellar contract deploy `
        --network $Network `
        --source $Source `
        --wasm $Wasm 2>&1

      if ($LASTEXITCODE -eq 0) {
        $contractId = ($deployOutput | Select-Object -Last 1).ToString().Trim()
        if ($contractId) { break }
      }

      Write-Host ($deployOutput | Out-String)
    } catch {
      Write-Host $_.Exception.Message
    }
  }

  if (-not $contractId) {
    throw "stellar contract deploy did not return a contract id after $DeployAttempts attempts. If the upload transaction just succeeded, wait 1-2 minutes and deploy by wasm hash, then rerun with -ExistingContractId."
  }
} else {
  Write-Host "Using existing StellarProofAttestor contract $contractId"
}

if (-not $SkipInit) {
  Write-Host "Initializing $contractId with router $RouterId and image id $ImageId..."
  stellar contract invoke `
    --network $Network `
    --source $Source `
    --id $contractId `
    -- `
    init `
    --router $RouterId `
    --image_id $ImageId
} else {
  Write-Host "Skipping init for $contractId"
}

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
  initialized = -not [bool]$SkipInit
  recordedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$result | ConvertTo-Json | Set-Content -LiteralPath $OutFile -Encoding utf8
Write-Host "Wrote $OutFile"
Write-Host "Contract ID: $contractId"
