async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

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

function scoreInvoice(invoice) {
  const agePenalty = Math.min(invoice.ageDays * 0.7, 35);
  const debtorBonus = invoice.debtorRating * 0.85;
  const sizePenalty = invoice.amountUsd > 20000 ? 4 : 0;
  return Math.max(0, Math.round(debtorBonus - agePenalty - sizePenalty));
}

function readPortfolio() {
  const inputs = Array.from(document.querySelectorAll("[data-invoice]"));
  const invoices = [];
  for (let i = 0; i < inputs.length; i += 3) {
    invoices.push({
      id: `INV-${i / 3 + 1}`,
      amountUsd: Number(inputs[i].value),
      ageDays: Number(inputs[i + 1].value),
      debtorRating: Number(inputs[i + 2].value)
    });
  }
  return {
    applicant: document.querySelector("#applicant").value,
    invoices
  };
}

async function proveEligibility(portfolio) {
  const totalValueUsd = portfolio.invoices.reduce((sum, invoice) => sum + invoice.amountUsd, 0);
  const weightedScore = Math.round(
    portfolio.invoices.reduce((sum, invoice) => sum + scoreInvoice(invoice) * invoice.amountUsd, 0) /
      totalValueUsd
  );
  const journal = {
    applicant: portfolio.applicant,
    invoiceCount: portfolio.invoices.length,
    totalValueUsd,
    weightedScore,
    eligible: weightedScore >= 50 && totalValueUsd >= 25000,
    inputCommitment: await sha256Hex(stableJson(portfolio))
  };
  const receiptId = await sha256Hex(`risc0-demo-receipt:${stableJson(journal)}`);
  const attestationId = await sha256Hex(`stellar-attestation:${receiptId}:${stableJson(journal)}`);
  return { journal, receiptId, attestationId };
}

function shortHash(value) {
  return `${value.slice(0, 12)}...${value.slice(-10)}`;
}

function render(proof) {
  const eligible = document.querySelector("#eligible");
  eligible.textContent = proof.journal.eligible ? "Eligible" : "Not eligible";
  eligible.className = proof.journal.eligible ? "pass" : "fail";
  document.querySelector("#total").textContent = `$${proof.journal.totalValueUsd.toLocaleString()}`;
  document.querySelector("#score").textContent = String(proof.journal.weightedScore);
  document.querySelector("#commitment").textContent = shortHash(proof.journal.inputCommitment);
  document.querySelector("#receipt").textContent = shortHash(proof.receiptId);
  document.querySelector("#attestation").textContent = shortHash(proof.attestationId);
}

const portfolioForm = document.querySelector("#portfolio-form");

if (portfolioForm) {
  portfolioForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    render(await proveEligibility(readPortfolio()));
  });
}


