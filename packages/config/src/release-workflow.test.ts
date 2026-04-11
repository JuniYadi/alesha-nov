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

    expect(config.access).toBe("public");
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

  test("docker ghcr workflow publishes sha and main tags", async () => {
    const workflowPath = join(repoRoot, ".github", "workflows", "docker-ghcr.yml");
    const workflowText = await Bun.file(workflowPath).text();

    expect(workflowText).toContain("name: Docker GHCR");
    expect(workflowText).toContain("uses: docker/build-push-action@v6");
    expect(workflowText).toContain("type=sha,format=short,prefix=sha-");
    expect(workflowText).toContain("type=raw,value=main,enable={{is_default_branch}}");
    expect(workflowText).toContain("cache-from: type=gha");
    expect(workflowText).toContain("cache-to: type=gha,mode=max");
    expect(workflowText).toContain("packages: write");
  });

  test("readme documents ghcr pull and run usage", async () => {
    const readmePath = join(repoRoot, "README.md");
    const readmeText = await Bun.file(readmePath).text();

    expect(readmeText).toContain("Pull and run from GHCR (`main` tag)");
    expect(readmeText).toContain("ghcr.io/<owner>/alesha-web:main");
    expect(readmeText).toContain("ghcr.io/<owner>/alesha-web:sha-<shortsha>");
  });

  test("release documentation exists with key commands", async () => {
    const docsPath = join(repoRoot, "docs", "releasing.md");
    const docsText = await Bun.file(docsPath).text();

    expect(docsText).toContain("bun run changeset");
    expect(docsText).toContain("bun run version-packages");
    expect(docsText).toContain("bun run release");
  });
});
