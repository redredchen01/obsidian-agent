const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const CLI = path.join(__dirname, "..", "bin", "cli.js");

describe("CLI", () => {
  it("should show help when no command given", () => {
    const output = execSync(`node "${CLI}"`, { encoding: "utf8" });
    expect(output).toContain("ctx");
    expect(output).toContain("install");
    expect(output).toContain("uninstall");
    expect(output).toContain("status");
  });

  it("should show help with supported platforms", () => {
    const output = execSync(`node "${CLI}"`, { encoding: "utf8" });
    expect(output).toContain("OpenClaw");
    expect(output).toContain("Claude Code");
  });

  describe("install", () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-cli-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should create .ctx/checkpoints/ directory", () => {
      execSync(`node "${CLI}" install`, {
        encoding: "utf8",
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir },
      });
      expect(fs.existsSync(path.join(tmpDir, ".ctx", "checkpoints"))).toBe(true);
    });

    it("should detect OpenClaw and install", () => {
      fs.mkdirSync(path.join(tmpDir, ".openclaw"), { recursive: true });
      const output = execSync(`node "${CLI}" install`, {
        encoding: "utf8",
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir },
      });
      expect(output).toContain("OpenClaw");
      expect(fs.existsSync(path.join(tmpDir, ".openclaw", "skills", "ctx", "SKILL.md"))).toBe(true);
    });

    it("should install lite version by default", () => {
      fs.mkdirSync(path.join(tmpDir, ".openclaw"), { recursive: true });
      execSync(`node "${CLI}" install`, {
        encoding: "utf8",
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir },
      });
      const installed = fs.readFileSync(
        path.join(tmpDir, ".openclaw", "skills", "ctx", "SKILL.md"),
        "utf8"
      );
      expect(installed).toContain("name: ctx");
      // Lite version should be small
      expect(installed.length).toBeLessThan(2100);
    });

    it("should install full version with --full flag", () => {
      fs.mkdirSync(path.join(tmpDir, ".openclaw"), { recursive: true });
      execSync(`node "${CLI}" install --full`, {
        encoding: "utf8",
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir },
      });
      const installed = fs.readFileSync(
        path.join(tmpDir, ".openclaw", "skills", "ctx", "SKILL.md"),
        "utf8"
      );
      expect(installed).toContain("name: ctx-full");
    });

    it("should fallback to .ctx/ when no platform detected", () => {
      const output = execSync(`node "${CLI}" install`, {
        encoding: "utf8",
        cwd: tmpDir,
        env: { ...process.env, HOME: tmpDir },
      });
      expect(output).toContain("universal fallback");
      expect(fs.existsSync(path.join(tmpDir, ".ctx", "SKILL.md"))).toBe(true);
    });
  });

  describe("status", () => {
    it("should report no state when not initialized", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-status-"));
      const output = execSync(`node "${CLI}" status`, {
        encoding: "utf8",
        cwd: tmpDir,
      });
      expect(output).toContain("No .ctx/state.json");
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });
  });
});
