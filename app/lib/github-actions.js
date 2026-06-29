const OWNER = process.env.GITHUB_OWNER || process.env.GH_OWNER || "nftkingiii";
const REPO = process.env.GITHUB_REPO || process.env.GH_REPO || "stellarproof";
const REF = process.env.GITHUB_REF_NAME || process.env.GITHUB_BRANCH || "main";
const WORKFLOW = process.env.GITHUB_WORKFLOW_FILE || "stellarproof-linux.yml";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function workflowUrl() {
  return `https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}`;
}

async function githubRequest(path, options = {}, requireToken = false) {
  if (requireToken && !TOKEN) {
    const error = new Error("Missing GITHUB_TOKEN. Add a GitHub fine-grained token in Vercel env vars.");
    error.status = 500;
    throw error;
  }

  const headers = {
    accept: "application/vnd.github+json",
    "user-agent": "stellarproof-vercel",
    "x-github-api-version": "2022-11-28",
    ...(options.headers || {}),
  };

  if (TOKEN) headers.authorization = `Bearer ${TOKEN}`;

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `GitHub API returned HTTP ${response.status}`);
    error.status = response.status;
    error.details = data;
    throw error;
  }

  return data;
}

async function readLatestProofJson() {
  const path = `/repos/${OWNER}/${REPO}/contents/app/proofs/latest-proof.json?ref=${encodeURIComponent(REF)}`;
  const data = await githubRequest(path);
  const content = Buffer.from(data.content || "", "base64").toString("utf8");
  return JSON.parse(content);
}

module.exports = {
  OWNER,
  REPO,
  REF,
  WORKFLOW,
  json,
  workflowUrl,
  githubRequest,
  readLatestProofJson,
};
