const fs = require("fs");
const path = require("path");

class SessionManager {
  constructor({ ctxDir }) {
    this.ctxDir = ctxDir;
    this.sessionFile = path.join(ctxDir, "current-session.json");
    this.checkpointDir = path.join(ctxDir, "checkpoints");
  }

  startSession() {
    const data = {
      startedAt: new Date().toISOString(),
      platform: process.env.CTX_PLATFORM || "unknown",
    };
    fs.writeFileSync(this.sessionFile, JSON.stringify(data, null, 2), "utf8");
  }

  currentSession() {
    if (!fs.existsSync(this.sessionFile)) return null;
    return JSON.parse(fs.readFileSync(this.sessionFile, "utf8"));
  }

  resume() {
    if (!fs.existsSync(this.checkpointDir)) return null;

    const files = fs.readdirSync(this.checkpointDir).filter((f) => f.endsWith(".md")).sort().reverse();
    if (files.length === 0) return null;

    const emergencyFiles = files.filter((f) => f.startsWith("ctx-emergency-"));
    const checkpointFiles = files.filter((f) => f.startsWith("ctx-checkpoint-"));

    const hasEmergency = emergencyFiles.length > 0;
    const hasCheckpoint = checkpointFiles.length > 0;

    // Read the most recent file (emergency takes priority)
    const latestFile = hasEmergency ? emergencyFiles[0] : checkpointFiles[0];
    if (!latestFile) return null;

    const content = fs.readFileSync(path.join(this.checkpointDir, latestFile), "utf8");

    const pctMatch = content.match(/percentage:\s*(\d+)/);
    // Extract summary: first non-header, non-frontmatter content line
    const bodyLines = content.split("---").slice(2).join("---").trim().split("\n");
    let summary = "";
    for (const line of bodyLines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        summary = trimmed;
        break;
      }
    }

    return {
      hasCheckpoint,
      hasEmergency,
      percentage: pctMatch ? parseInt(pctMatch[1]) : 0,
      summary,
      filename: latestFile,
    };
  }

  formatResumeMessage({ hasCheckpoint, hasEmergency, percentage, summary }) {
    if (hasEmergency) {
      return `⚠️ Resuming from emergency save (context was at ~${percentage}%). Last session: ${summary}`;
    }
    if (hasCheckpoint) {
      return `📋 Resuming from checkpoint (~${percentage}%). Last session: ${summary}`;
    }
    return "";
  }

  endSession() {
    if (fs.existsSync(this.sessionFile)) {
      fs.unlinkSync(this.sessionFile);
    }
  }
}

module.exports = { SessionManager };
