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
  if (!value) return "-";
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

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) element.textContent = value || "-";
}

function setRemoteMessage(text, state = "") {
  const message = document.querySelector("#remote-proof-message");
  if (!message) return;
  message.textContent = text;
  message.className = `remote-proof-message ${state}`.trim();
}

function renderWorkflowStatus(payload) {
  const status = document.querySelector("#linux-proof-status");
  if (!status || !payload?.run) return;

  status.className = "";
  const run = payload.run;
  const runStatus = run.status === "in_progress" ? "Running" : run.status === "queued" ? "Queued" : run.status;
  status.textContent = runStatus || "Workflow started";
  setText("#linux-proof-generated", run.updatedAt ? new Date(run.updatedAt).toLocaleString() : "Waiting for GitHub Actions");

  const runLink = document.querySelector("#linux-proof-run");
  if (runLink && run.htmlUrl) {
    runLink.innerHTML = `<a href="${run.htmlUrl}">GitHub Actions run</a>`;
  }
}

function renderLatestProof(latest, workflowRun) {
  const status = document.querySelector("#linux-proof-status");
  if (!status) return;

  if (!latest || latest.status !== "ready" || !latest.proof) {
    status.textContent = latest?.status === "pending" ? "Pending workflow run" : "Unavailable";
    status.className = "";
    setText("#linux-proof-generated", latest?.message || "Run GitHub Actions to publish proof output.");
    return;
  }

  status.textContent = "Ready";
  status.className = "pass";
  setText("#linux-proof-generated", new Date(latest.updatedAt).toLocaleString());
  setText("#linux-proof-image-id", shortHash(latest.proof.imageId));
  setText("#linux-proof-journal-digest", shortHash(latest.proof.journalDigest));
  setText("#linux-proof-hash", shortHash(latest.proof.proofTxtSha256));

  const run = document.querySelector("#linux-proof-run");
  const runUrl = workflowRun?.htmlUrl || latest.runUrl;
  if (run && runUrl) {
    run.innerHTML = `<a href="${runUrl}">GitHub Actions run</a>`;
  }
}

async function loadLatestLinuxProof() {
  const status = document.querySelector("#linux-proof-status");
  if (!status) return null;

  try {
    const liveResponse = await fetch("/api/proof-status", { cache: "no-store" });
    if (liveResponse.ok) {
      const payload = await liveResponse.json();

      if (payload.status === "queued" || payload.status === "in_progress") {
        renderWorkflowStatus(payload);
        return payload;
      }

      if (payload.proof) {
        renderLatestProof(payload.proof, payload.run);
        return payload;
      }
    }
  } catch (_) {
    // Local static server has no /api route. Fall back to the checked-in proof JSON below.
  }

  try {
    const response = await fetch("proofs/latest-proof.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const latest = await response.json();
    renderLatestProof(latest);
    return { status: latest.status, proof: latest };
  } catch (error) {
    status.textContent = "Not published yet";
    status.className = "";
    setText("#linux-proof-generated", "Run the StellarProof Linux Build workflow.");
    return null;
  }
}

function isCurrentTriggeredRun(run) {
  if (!window.stellarProofStartedAt) return true;
  const createdAt = Date.parse(run?.createdAt || "");
  return Number.isFinite(createdAt) && createdAt >= window.stellarProofStartedAt - 60000;
}

function startProofPolling(startedAt = Date.now()) {
  window.stellarProofStartedAt = startedAt;
  if (window.stellarProofPoll) clearInterval(window.stellarProofPoll);

  window.setTimeout(loadLatestLinuxProof, 8000);
  window.stellarProofPoll = window.setInterval(async () => {
    const payload = await loadLatestLinuxProof();
    if (
      payload?.status === "completed" &&
      payload?.conclusion === "success" &&
      isCurrentTriggeredRun(payload.run)
    ) {
      clearInterval(window.stellarProofPoll);
      window.stellarProofPoll = null;
      setRemoteMessage("Real RISC Zero proof finished. Latest proof is now displayed below.", "ready");
    }
  }, 30000);
}

async function triggerRemoteProof() {
  const button = document.querySelector("#generate-proof-button");
  if (button) button.disabled = true;
  setRemoteMessage("Starting the Linux RISC Zero proof workflow on GitHub Actions...", "working");

  try {
    const response = await fetch("/api/proof-trigger", { method: "POST" });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || `HTTP ${response.status}`);
    }

    setRemoteMessage("GitHub Actions started. The proof can take several minutes; this page will keep checking.", "working");
    startProofPolling(Date.now());
  } catch (error) {
    setRemoteMessage(
      `Local preview generated. Remote proof was not started: ${error.message}`,
      "error"
    );
  } finally {
    if (button) button.disabled = false;
  }
}

const portfolioForm = document.querySelector("#portfolio-form");

if (portfolioForm) {
  portfolioForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    render(await proveEligibility(readPortfolio()));
    await triggerRemoteProof();
  });
}

loadLatestLinuxProof();
