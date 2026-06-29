const { OWNER, REPO, REF, WORKFLOW, githubRequest, json, workflowUrl } = require("../lib/github-actions");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    json(res, 405, { status: "error", message: "Use POST to trigger the proof workflow." });
    return;
  }

  try {
    await githubRequest(
      `/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: "POST",
        body: JSON.stringify({ ref: REF }),
      },
      true
    );

    json(res, 202, {
      status: "queued",
      message: "GitHub Actions proof workflow started.",
      workflow: WORKFLOW,
      ref: REF,
      workflowUrl: workflowUrl(),
    });
  } catch (error) {
    json(res, error.status || 500, {
      status: "error",
      message: error.message,
      details: error.details || null,
    });
  }
};

