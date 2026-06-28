const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const proofPath = path.join(__dirname, "..", "proof.txt");
const outDir = path.join(__dirname, "..", "app", "proofs");
const outPath = path.join(outDir, "latest-proof.json");

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!fs.existsSync(proofPath)) {
  fail(`Missing proof artifact at ${proofPath}`);
}

const raw = fs.readFileSync(proofPath, "utf8").trim();
const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

if (lines.length !== 4) {
  fail(`Expected proof.txt to contain 4 non-empty lines, found ${lines.length}`);
}

const [seal, imageId, journalDigest, journalBytes] = lines;
const repo = process.env.GITHUB_REPOSITORY || "nftkingiii/stellarproof";
const runId = process.env.GITHUB_RUN_ID || null;
const runAttempt = process.env.GITHUB_RUN_ATTEMPT || null;
const commit = process.env.GITHUB_SHA || null;
const runUrl = runId ? `https://github.com/${repo}/actions/runs/${runId}` : null;

const latestProof = {
  status: "ready",
  updatedAt: new Date().toISOString(),
  source: "github-actions-risc-zero-groth16",
  repository: repo,
  commit,
  runId,
  runAttempt,
  runUrl,
  artifacts: {
    proof: "stellarproof-proof/proof.txt",
    attestorWasm: "stellarproof-attestor-wasm/stellarproof_attestor.wasm"
  },
  proof: {
    seal,
    imageId,
    journalDigest,
    journalBytes,
    proofTxtSha256: crypto.createHash("sha256").update(raw).digest("hex"),
    byteLengths: {
      sealHex: seal.length,
      imageIdHex: imageId.length,
      journalDigestHex: journalDigest.length,
      journalBytesHex: journalBytes.length
    }
  }
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, `${JSON.stringify(latestProof, null, 2)}\n`);
console.log(`Published latest proof JSON to ${outPath}`);
