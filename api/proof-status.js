const {
  OWNER,
  REPO,
  REF,
  WORKFLOW,
  githubRequest,
  json,
  readLatestProofJson,
  workflowUrl,
} = require("../lib/github-actions");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("allow", "GET");
    json(res, 405, { status: "error", message: "Use GET to read proof workflow status." });
    return;
  }

  try {
    const runs = await githubRequest(
      `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs?branch=${encodeURIComponent(REF)}&per_page=5`
    );
    const latestRun = runs.workflow_runs?.[0] || null;
    let latestProof = null;

    if (latestRun?.status === "completed" && latestRun.conclusion === "success") {
      latestProof = await readLatestProofJson();
    }

    json(res, 200, {
      status: latestRun?.status || "unknown",
      conclusion: latestRun?.conclusion || null,
      workflow: WORKFLOW,
      workflowUrl: workflowUrl(),
      run: latestRun
        ? {
            id: latestRun.id,
            status: latestRun.status,
            conclusion: latestRun.conclusion,
            htmlUrl: latestRun.html_url,
            createdAt: latestRun.created_at,
            updatedAt: latestRun.updated_at,
          }
        : null,
      proof: latestProof,
    });
  } catch (error) {
    json(res, error.status || 500, {
      status: "error",
      message: error.message,
      details: error.details || null,
    });
  }
};
