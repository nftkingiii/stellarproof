param(
  [Parameter(Mandatory=$true)] [string] $Network,
  [Parameter(Mandatory=$true)] [string] $Source,
  [Parameter(Mandatory=$true)] [string] $AttestorId,
  [Parameter(Mandatory=$true)] [string] $JournalXdr,
  [string] $ProofFile = "proof.txt"
)

$lines = Get-Content -LiteralPath $ProofFile
if ($lines.Count -lt 4) {
  throw "proof.txt must contain seal, image_id, journal_digest, and journal_bytes hex lines"
}

$seal = $lines[0]
$journalBytes = $lines[3]

stellar contract invoke `
  --network $Network `
  --source $Source `
  --id $AttestorId `
  -- `
  submit_attestation `
  --journal $JournalXdr `
  --journal_bytes $journalBytes `
  --seal $seal
