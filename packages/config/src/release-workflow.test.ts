import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..", "..");

type ChangesetConfig = {
  access?: string;
  updateInternalDependencies?: string;
  commit?: boolean;
  baseBranch?: string;
};

describe("release workflow setup", () => {
  test("changesets config matches release strategy", async () => {
    const configPath = join(repoRoot, ".changeset", "config.json");
    const config = (await Bun.file(configPath).json()) as ChangesetConfig;

    expect(config.access).toBe("restricted");
    expect(config.updateInternalDependencies).toBe("minor");
    expect(config.commit).toBe(true);
    expect(config.baseBranch).toBe("main");
  });

  test("release workflow includes push-to-main and changesets action", async () => {
    const workflowPath = join(repoRoot, ".github", "workflows", "release.yml");
    const workflowText = await Bun.file(workflowPath).text();

    expect(workflowText).toContain("push:");
    expect(workflowText).toContain("branches:");
    expect(workflowText).toContain("- main");
    expect(workflowText).toContain("uses: changesets/action@v1");
    expect(workflowText).toContain("GITHUB_TOKEN");
    expect(workflowText).toContain("NPM_TOKEN");
  });

  test("release documentation exists with key commands", async () => {
    const docsPath = join(repoRoot, "docs", "releasing.md");
    const docsText = await Bun.file(docsPath).text();

    expect(docsText).toContain("bun run changeset");
    expect(docsText).toContain("bun run version-packages");
    expect(docsText).toContain("bun run release");
  });
});
