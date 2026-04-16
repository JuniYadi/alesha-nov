import { describe, expect, test } from "bun:test";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "..", "..", "..");

type PkgManifest = {
  name: string;
  main?: string;
  types?: string;
  exports?: Record<string, { types?: string; import?: string; default?: string }>;
  repository?: { type?: string; url?: string; directory?: string };
  license?: string;
  author?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: { url?: string };
  engines?: { node?: string; bun?: string };
  publishConfig?: { access?: string };
  private?: boolean;
};

const packageDirs = ["config", "db", "auth", "email", "auth-web", "auth-react"] as const;

async function readManifest(pkgDir: (typeof packageDirs)[number]): Promise<PkgManifest> {
  const path = join(repoRoot, "packages", pkgDir, "package.json");
  return Bun.file(path).json();
}

describe("npm publish metadata", () => {
  test("all packages include required npm metadata and publish config", async () => {
    for (const pkgDir of packageDirs) {
      const manifest = await readManifest(pkgDir);

      expect(manifest.repository?.type).toBe("git");
      expect(manifest.repository?.url).toBe("https://github.com/JuniYadi/alesha-nov.git");
      expect(manifest.repository?.directory).toBe(`packages/${pkgDir}`);
      expect(manifest.license).toBe("MIT");
      expect(manifest.author).toBe("JuniYadi");
      expect(Array.isArray(manifest.keywords)).toBe(true);
      expect((manifest.keywords ?? []).length).toBeGreaterThan(0);
      expect(manifest.homepage).toBe("https://github.com/JuniYadi/alesha-nov#readme");
      expect(manifest.bugs?.url).toBe("https://github.com/JuniYadi/alesha-nov/issues");
      expect(manifest.engines?.node).toBe(">=22.12.0");
      if (pkgDir === "config") {
        expect(manifest.engines?.bun).toBeUndefined();
      } else {
        expect(manifest.engines?.bun).toBe(">=1.3.0");
      }
      expect(manifest.publishConfig?.access).toBe("public");
    }
  });

  test("@alesha-nov/auth-react publishes dist entrypoints", async () => {
    const manifest = await readManifest("auth-react");

    expect(manifest.private).toBeUndefined();
    expect(manifest.main).toBe("./dist/index.js");
    expect(manifest.types).toBe("./dist/index.d.ts");

    const rootExport = manifest.exports?.["."];
    const contextExport = manifest.exports?.["./context"];
    const hooksExport = manifest.exports?.["./hooks"];

    expect(rootExport?.import).toBe("./dist/index.js");
    expect(rootExport?.types).toBe("./dist/index.d.ts");
    expect(contextExport?.import).toBe("./dist/context.js");
    expect(contextExport?.types).toBe("./dist/context.d.ts");
    expect(hooksExport?.import).toBe("./dist/hooks.js");
    expect(hooksExport?.types).toBe("./dist/hooks.d.ts");
  });
});
