const fs = require("fs");
const path = require("path");

class CheckpointManager {
  constructor({ dir }) {
    this.dir = dir;
    this._seq = 0;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  save({ percentage, threshold, summary, keyFiles, decisions }) {
    const now = new Date();
    // Add 1ms per call within same instance to guarantee unique timestamps
    now.setMilliseconds(now.getMilliseconds() + this._seq++);
    const pad = (n) => String(n).padStart(2, "0");
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const filename = `ctx-checkpoint-${ts}-${ms}.md`;

    // Truncate to fit 50 lines
    const truncatedFiles = (keyFiles || []).slice(0, 5);
    const truncatedDecisions = (decisions || []).slice(0, 5);
    const truncatedSummary = (summary || "").slice(0, 200);

    const lines = [
      "---",
      "type: checkpoint",
      `percentage: ${percentage}`,
      `threshold: ${threshold}`,
      `timestamp: ${now.toISOString()}`,
      "---",
      "",
      `## Checkpoint at ${percentage}%`,
      "",
      truncatedSummary,
      "",
    ];

    if (truncatedFiles.length > 0) {
      lines.push("### Key Files");
      for (const f of truncatedFiles) lines.push(`- ${f}`);
      lines.push("");
    }

    if (truncatedDecisions.length > 0) {
      lines.push("### Decisions");
      for (const d of truncatedDecisions) lines.push(`- ${d}`);
      lines.push("");
    }

    const content = lines.join("\n");
    fs.writeFileSync(path.join(this.dir, filename), content, "utf8");
  }

  list() {
    const files = fs
      .readdirSync(this.dir)
      .filter((f) => f.startsWith("ctx-checkpoint-") && f.endsWith(".md"));

    const parsed = files.map((f) => {
      const content = fs.readFileSync(path.join(this.dir, f), "utf8");
      const pctMatch = content.match(/percentage: (\d+)/);
      const threshMatch = content.match(/threshold: (\w+)/);
      const tsMatch = content.match(/timestamp: (.+)/);

      const bodyLines = content.split("---").slice(2).join("---").trim().split("\n");
      let summary = "";
      for (const line of bodyLines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("---")) {
          summary = trimmed;
          break;
        }
      }

      return {
        filename: f,
        percentage: pctMatch ? parseInt(pctMatch[1]) : 0,
        threshold: threshMatch ? threshMatch[1] : "unknown",
        timestamp: tsMatch ? tsMatch[1].trim() : null,
        summary,
      };
    });

    // Sort by timestamp descending (newest first)
    parsed.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return parsed;
  }

  latest() {
    const all = this.list();
    return all.length > 0 ? all[0] : null;
  }

  cleanup(keep = 5) {
    const all = this.list(); // sorted newest first
    if (all.length <= keep) return;

    const toDelete = all.slice(keep);
    for (const cp of toDelete) {
      fs.unlinkSync(path.join(this.dir, cp.filename));
    }
  }
}

module.exports = { CheckpointManager };
