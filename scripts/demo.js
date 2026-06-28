const crypto = require("crypto");

const samplePortfolio = {
  applicant: "GDEMO4QPOCINVOICEFACTORING7STELLARTESTNET",
  invoices: [
    { id: "INV-1042", amountUsd: 18000, ageDays: 18, debtorRating: 91 },
    { id: "INV-1048", amountUsd: 12500, ageDays: 27, debtorRating: 84 },
    { id: "INV-1051", amountUsd: 22000, ageDays: 34, debtorRating: 88 }
  ]
};

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Hex(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function scoreInvoice(invoice) {
  const agePenalty = Math.min(invoice.ageDays * 0.7, 35);
  const debtorBonus = invoice.debtorRating * 0.85;
  const sizePenalty = invoice.amountUsd > 20000 ? 4 : 0;
  return Math.max(0, Math.round(debtorBonus - agePenalty - sizePenalty));
}

function proveEligibility(portfolio) {
  const totalValueUsd = portfolio.invoices.reduce((sum, invoice) => sum + invoice.amountUsd, 0);
  const weightedScore = Math.round(
    portfolio.invoices.reduce((sum, invoice) => {
      return sum + scoreInvoice(invoice) * invoice.amountUsd;
    }, 0) / totalValueUsd
  );
  const eligible = weightedScore >= 50 && totalValueUsd >= 25000;
  const commitment = sha256Hex(stableJson(portfolio));
  const journal = {
    applicant: portfolio.applicant,
    invoiceCount: portfolio.invoices.length,
    totalValueUsd,
    weightedScore,
    eligible,
    inputCommitment: commitment
  };
  const receiptId = sha256Hex(`risc0-demo-receipt:${stableJson(journal)}`);
  return { journal, receiptId };
}

function submitToStellarAttestor(proof) {
  const attestationId = sha256Hex(`stellar-attestation:${proof.receiptId}:${stableJson(proof.journal)}`);
  return {
    contract: "StellarProofAttestor",
    network: "Stellar Testnet",
    verifier: "RISC Zero verifier router",
    accepted: proof.journal.eligible,
    attestationId,
    publicRecord: proof.journal
  };
}

function run() {
  const proof = proveEligibility(samplePortfolio);
  const attestation = submitToStellarAttestor(proof);

  if (process.argv.includes("--test")) {
    if (!proof.journal.eligible) throw new Error("Expected sample portfolio to be eligible");
    if (proof.journal.totalValueUsd !== 52500) throw new Error("Unexpected total value");
    if (proof.receiptId.length !== 64) throw new Error("Receipt id must be a SHA-256 hex string");
    console.log("StellarProof demo test passed.");
    return;
  }

  console.log("StellarProof local demo");
  console.log("=====================");
  console.log("Private invoices:", samplePortfolio.invoices.length);
  console.log("Public journal:", JSON.stringify(proof.journal, null, 2));
  console.log("Mock RISC Zero receipt:", proof.receiptId);
  console.log("Mock Stellar attestation:", JSON.stringify(attestation, null, 2));
}

run();
