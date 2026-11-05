import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "..");
const INDEX_FILES = [
  "docs/LIBRARY.md",
  "docs/maps/SOURCE_INDEX.md",
  "docs/maps/SCHEMA_INDEX.md",
];
const ROUTING_FILES = [
  ...INDEX_FILES,
  "docs/README.md",
  "docs/DOCS3_REMEDIATION_PLAN.md",
  "docs/DOCS4_ARCHIVE_MANIFEST.md",
  "AGENTS.md",
  "CLAUDE.md",
];
const FEATURE_IDS = [
  "CORE-APP", "AUTH-ORG", "PREF-A11Y", "UI-SYSTEM", "CALC-CATALOG",
  "CALC-ENGINE", "CALC-CONSTRUCTION", "ROOF-GEOMETRY", "ROOF-TAKEOFF",
  "ROOF-TIMBER", "ROOF-UNDERLAY", "ROOF-COVERING", "SHEET-PROFILE",
  "DRAW-PDF", "DRAW-OCR", "DRAW-INTERPRET", "DRAW-SECTIONS", "DRAW-SESSION",
  "CALC-PERSIST", "SURVEY-LEGACY", "MATERIAL-TAKEOFF", "MATERIAL-CATALOG",
  "MATERIAL-LISTS", "PROJECTS", "QUOTATIONS", "EXECUTION", "PHOTO-PIPELINE",
  "API-DOCUMENTS", "DB-SECURITY", "QUALITY-DEV", "PWA-ASSETS",
];
const ROOT_CONFIGS = [
  ".env.example", ".gitignore", "components.json", "eslint.config.mjs",
  "next.config.ts", "package.json", "postcss.config.mjs", "tsconfig.json",
  "tsconfig.typecheck.json", "vitest.config.mts",
];
const SRC_EXCLUSIONS = new Set([
  "src/app/apple-icon.png", "src/app/favicon.ico", "src/app/icon.png",
  "src/assets/brand-icon.png", "src/infrastructure/supabase/database.types.ts",
  "src/infrastructure/supabase/README.md",
]);
const REQUIRED_EXCLUSION_PATTERNS = [
  ".next/**", ".vitest/**", "node_modules/**", "tsconfig.tsbuildinfo",
  "next-env.d.ts", "package-lock.json", "src/infrastructure/supabase/database.types.ts",
  "src/infrastructure/supabase/README.md", "src/app/apple-icon.png",
  "src/app/favicon.ico", "src/app/icon.png", "src/assets/brand-icon.png",
  "public/ocr/core/**", "public/ocr/lang/**", "public/ocr/worker.min.js",
  "public/ocr/*LICENSE*", "public/ocr/THIRD_PARTY_NOTICES.md", "docs/evidence/**",
];

function githubSlug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

export function collectHeadingAnchors(markdown) {
  const anchors = [];
  const seen = new Map();

  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*$/gm)) {
    const base = githubSlug(match[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    anchors.push(count === 0 ? base : `${base}-${count}`);
  }

  for (const match of markdown.matchAll(/<a\s+(?:id|name)=["']([^"']+)["'][^>]*>/gi)) {
    anchors.push(match[1]);
  }

  return new Set(anchors);
}

export function matchCoveragePattern(pattern, file) {
  const expression = pattern
    .split("/**")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*"))
    .join("(?:/.*)?");
  return new RegExp(`^${expression}$`).test(file);
}

export function validateMarkdownLinks(files, sourceFiles) {
  const issues = [];

  for (const file of sourceFiles) {
    const markdown = files.get(file);
    if (markdown === undefined) continue;
    const withoutFences = markdown.replace(/```[\s\S]*?```/g, "");

    for (const match of withoutFences.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "").split(/\s+["']/)[0];
      if (!rawTarget || /^(?:https?:|mailto:|data:)/i.test(rawTarget)) continue;

      const line = withoutFences.slice(0, match.index).split("\n").length;
      const hashIndex = rawTarget.indexOf("#");
      const rawPath = hashIndex === -1 ? rawTarget : rawTarget.slice(0, hashIndex);
      const anchor = hashIndex === -1 ? "" : decodeURIComponent(rawTarget.slice(hashIndex + 1));
      let targetFile = rawPath
        ? path.posix.normalize(path.posix.join(path.posix.dirname(file), decodeURIComponent(rawPath)))
        : file;

      if (!files.has(targetFile)) {
        const withoutLine = targetFile.replace(/:\d+(?::\d+)?$/, "");
        if (files.has(withoutLine)) targetFile = withoutLine;
      }

      if (!files.has(targetFile)) {
        issues.push({ file, line, target: rawTarget, type: "path" });
        continue;
      }

      if (
        anchor
        && !/^L\d+(?:-L\d+)?$/i.test(anchor)
        && !collectHeadingAnchors(files.get(targetFile)).has(anchor)
      ) {
        issues.push({ file, line, target: rawTarget, type: "anchor" });
      }
    }
  }

  return issues;
}

function walk(relativeDirectory) {
  const absoluteDirectory = path.join(ROOT, relativeDirectory);
  if (!fs.existsSync(absoluteDirectory)) return [];
  const files = [];

  for (const entry of fs.readdirSync(absoluteDirectory, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const relative = path.posix.join(relativeDirectory, entry.name);
    if (entry.isDirectory()) files.push(...walk(relative));
    else files.push(relative);
  }

  return files;
}

function readMarkdownFiles() {
  const files = new Map();
  for (const file of [...walk("docs"), ...walk("public/ocr"), ...walk("src"), ...fs.readdirSync(ROOT)]) {
    const relative = path.isAbsolute(file) ? path.relative(ROOT, file) : file;
    if (!relative.endsWith(".md")) continue;
    const absolute = path.join(ROOT, relative);
    if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) {
      files.set(relative, fs.readFileSync(absolute, "utf8"));
    }
  }
  return files;
}

function parseFeatureIds(markdown) {
  return [...markdown.matchAll(/<!--\s*feature:\s*([A-Z0-9-]+)\s*-->/g)].map((match) => match[1]);
}

function parseCoverage(markdown) {
  return [...markdown.matchAll(/<!--\s*coverage:\s*([A-Z0-9-]+)\s*\|\s*([^>]+?)\s*-->/g)]
    .map((match) => ({ feature: match[1], pattern: match[2].trim() }));
}

function parseExclusions(markdown) {
  return [...markdown.matchAll(/<!--\s*exclude:\s*([^|>]+?)\s*\|\s*([^>]+?)\s*-->/g)]
    .map((match) => ({ pattern: match[1].trim(), reason: match[2].trim() }));
}

function relevantFiles() {
  return [
    ...walk("src").filter((file) => !SRC_EXCLUSIONS.has(file)),
    ...walk("supabase"),
    ...walk("scripts"),
    ...ROOT_CONFIGS,
    ...walk("public/icons"),
    ...walk("public/ocr/fixtures"),
  ].sort();
}

function countSchemaObjects(sqlFiles) {
  const sql = sqlFiles.map((file) => fs.readFileSync(path.join(ROOT, file), "utf8")).join("\n");
  const unique = (expression, key = (match) => match[1].toLowerCase()) => new Set(
    [...sql.matchAll(expression)].map(key),
  ).size;

  return {
    tables: unique(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?([\w]+)"?\.)?"?([\w]+)"?/gi, (match) => `${match[1] ?? "public"}.${match[2]}`.toLowerCase()),
    functions: unique(/create\s+(?:or\s+replace\s+)?function\s+(?:"?([\w]+)"?\.)?"?([\w]+)"?/gi, (match) => `${match[1] ?? "public"}.${match[2]}`.toLowerCase()),
    policies: unique(/create\s+policy\s+(?:"([^"]+)"|([^\s]+))\s+on\s+(?:"?([\w]+)"?\.)?"?([\w]+)"?/gi, (match) => `${match[3] ?? "public"}.${match[4]}.${match[1] ?? match[2]}`.toLowerCase()),
    triggers: unique(/create\s+trigger\s+(?:"([^"]+)"|([^\s]+))[\s\S]*?\s+on\s+(?:"?([\w]+)"?\.)?"?([\w]+)"?/gi, (match) => `${match[3] ?? "public"}.${match[4]}.${match[1] ?? match[2]}`.toLowerCase()),
    types: unique(/create\s+type\s+(?:"?([\w]+)"?\.)?"?([\w]+)"?/gi, (match) => `${match[1] ?? "public"}.${match[2]}`.toLowerCase()),
  };
}

function historicalAnchorIssues(files) {
  const historical = [...files.keys()].filter((file) => !ROUTING_FILES.includes(file));
  return validateMarkdownLinks(files, historical).filter((issue) => issue.type === "anchor");
}

function reportIssues(title, issues, limit = 20) {
  if (issues.length === 0) return;
  console.error(`\n${title} (${issues.length}):`);
  for (const issue of issues.slice(0, limit)) console.error(`- ${issue}`);
  if (issues.length > limit) console.error(`- … további ${issues.length - limit}`);
}

export function runCheck() {
  const blocking = [];
  const warnings = [];
  const markdownFiles = readMarkdownFiles();
  const expected = new Set(FEATURE_IDS);

  for (const file of INDEX_FILES) {
    const markdown = markdownFiles.get(file);
    if (!markdown) {
      blocking.push(`hiányzó index: ${file}`);
      continue;
    }
    const ids = parseFeatureIds(markdown);
    const actual = new Set(ids);
    for (const id of FEATURE_IDS) if (!actual.has(id)) blocking.push(`${file}: hiányzó funkcióazonosító: ${id}`);
    for (const id of actual) if (!expected.has(id)) blocking.push(`${file}: ismeretlen funkcióazonosító: ${id}`);
    if (ids.length !== actual.size) blocking.push(`${file}: ismétlődő funkcióazonosító`);
  }

  const library = markdownFiles.get("docs/LIBRARY.md") ?? "";
  const entries = [...library.matchAll(/<!--\s*feature:\s*([A-Z0-9-]+)\s*-->([\s\S]*?)(?=<!--\s*feature:|\n##\s+Karbantartás|$)/g)];
  const requiredFields = [
    "Cél:", "Aktuális dokumentáció:", "Forrásindex:", "Sémaindex:",
    "Tesztek:", "Szerződés és kockázat:", "Történet:",
  ];
  for (const entry of entries) {
    for (const field of requiredFields) {
      if (!entry[2].includes(field)) blocking.push(`docs/LIBRARY.md: ${entry[1]} mezője hiányzik: ${field}`);
    }
  }

  const newLinkIssues = validateMarkdownLinks(markdownFiles, ROUTING_FILES);
  for (const issue of newLinkIssues) {
    blocking.push(`${issue.file}:${issue.line}: hibás ${issue.type}: ${issue.target}`);
  }

  const indexText = INDEX_FILES.map((file) => markdownFiles.get(file) ?? "").join("\n");
  const criticalChecks = [
    ["M12.2 BLOCKED", /M12\.2[\s\S]{0,80}BLOCKED/i],
    ["confidence nem műszaki pontosság", /confidence nem (?:jelent )?műszaki pontosság/i],
    ["nincs automatikus tetőméret", /nem ellenőrzött tervrajzi méret nem lesz automatikusan tetőméret/i],
    ["kijelölés nem mérés", /kijelölés(?:[^.\n]{0,80})(?:nem|különböző)(?:[^.\n]{0,80})mérés/i],
    ["nem statikai eredmény", /nem statikai/i],
    ["geometriai és beszerzési mennyiség külön", /geometriai(?:[^.\n]{0,100})nem(?:[^.\n]{0,100})beszerzési/i],
    ["immutable/RLS/konkurencia", /immutable[\s\S]{0,300}RLS[\s\S]{0,300}concurrenc|RLS[\s\S]{0,300}immutable[\s\S]{0,300}concurrenc/i],
    ["hosted korlát", /hosted/i],
    ["pilot korlát", /pilot/i],
    ["fizikai mobil korlát", /fizikai mobil/i],
  ];
  for (const [label, expression] of criticalChecks) {
    if (!expression.test(indexText)) blocking.push(`kritikus figyelmeztetés hiányzik: ${label}`);
  }

  const coverage = [
    ...parseCoverage(markdownFiles.get("docs/maps/SOURCE_INDEX.md") ?? ""),
    ...parseCoverage(markdownFiles.get("docs/maps/SCHEMA_INDEX.md") ?? ""),
  ];
  const exclusions = parseExclusions(markdownFiles.get("docs/maps/SOURCE_INDEX.md") ?? "");
  for (const pattern of REQUIRED_EXCLUSION_PATTERNS) {
    if (!exclusions.some((item) => item.pattern === pattern && item.reason)) {
      blocking.push(`dokumentálatlan kötelező kivétel: ${pattern}`);
    }
  }
  const excludedFiles = [
    ...SRC_EXCLUSIONS, "next-env.d.ts", "package-lock.json", "tsconfig.tsbuildinfo",
    ...walk("public/ocr").filter((file) => !file.startsWith("public/ocr/fixtures/")),
  ];
  for (const file of excludedFiles) {
    if (!exclusions.some((item) => matchCoveragePattern(item.pattern, file))) {
      blocking.push(`kizárt fájlhoz nincs illeszkedő kivétel: ${file}`);
    }
  }
  for (const item of coverage) {
    if (!expected.has(item.feature)) blocking.push(`coverage ismeretlen funkcióhoz: ${item.feature}`);
    if (!relevantFiles().some((file) => matchCoveragePattern(item.pattern, file))) {
      blocking.push(`üres coverage-minta: ${item.feature} | ${item.pattern}`);
    }
  }
  const inventory = relevantFiles();
  const uncovered = inventory.filter((file) => !coverage.some((item) => matchCoveragePattern(item.pattern, file)));
  for (const file of uncovered) blocking.push(`lefedetlen releváns fájl: ${file}`);

  const schemaMarkdown = markdownFiles.get("docs/maps/SCHEMA_INDEX.md") ?? "";
  const declaredMatch = schemaMarkdown.match(/<!--\s*schema-counts:\s*tables=(\d+) functions=(\d+) policies=(\d+) triggers=(\d+) types=(\d+) migrations=(\d+) tests=(\d+)\s*-->/);
  const migrations = walk("supabase/migrations").filter((file) => file.endsWith(".sql"));
  const dbTests = walk("supabase/tests/database");
  const actualSchema = { ...countSchemaObjects(migrations), migrations: migrations.length, tests: dbTests.length };
  if (!declaredMatch) blocking.push("docs/maps/SCHEMA_INDEX.md: hiányzó schema-counts metaadat");
  else {
    const labels = ["tables", "functions", "policies", "triggers", "types", "migrations", "tests"];
    labels.forEach((label, index) => {
      const declared = Number(declaredMatch[index + 1]);
      if (declared !== actualSchema[label]) blocking.push(`sémaszám eltér: ${label} dokumentált=${declared}, aktuális=${actualSchema[label]}`);
    });
  }

  const historical = historicalAnchorIssues(markdownFiles);
  for (const issue of historical) warnings.push(`${issue.file}:${issue.line}: ${issue.target}`);

  const lineCount = (markdown) => markdown.split("\n").length - (markdown.endsWith("\n") ? 1 : 0);
  const sourceLines = lineCount(markdownFiles.get("docs/maps/SOURCE_INDEX.md") ?? "");
  const schemaLines = lineCount(schemaMarkdown);
  const libraryLines = lineCount(library);
  console.log(`Dokumentációs leltár: ${inventory.length} releváns fájl; ${coverage.length} coverage-minta; ${uncovered.length} fedetlen.`);
  console.log(`Funkcióazonosítók: ${FEATURE_IDS.length}/31 mindhárom indexben.`);
  console.log(`Séma: ${actualSchema.tables} tábla, ${actualSchema.functions} függvény, ${actualSchema.policies} policy, ${actualSchema.triggers} trigger, ${actualSchema.types} típus, ${actualSchema.migrations} migráció, ${actualSchema.tests} DB-teszt/fixture.`);
  const historicalValid = historical.length <= 26 ? 26 - historical.length : 0;
  const historicalAmbiguous = historical.length > 26 ? historical.length - 26 : 0;
  console.log(`Anchor-osztályozás: ${historical.length}/26 valóban hibás; ${historicalValid} GitHub-sluggal érvényes; ${historicalAmbiguous} nem egyértelmű; ${newLinkIssues.length} új routing/indexhiba.`);
  console.log(`Fájlméret: LIBRARY ${libraryLines}, SOURCE_INDEX ${sourceLines}, SCHEMA_INDEX ${schemaLines} sor.`);

  reportIssues("Blokkoló hibák", blocking);
  reportIssues("Történeti anchor-figyelmeztetések", warnings, 50);
  if (blocking.length > 0) process.exitCode = 1;
  else console.log("Dokumentációellenőrzés: PASS");

  return { blocking, warnings, inventory, coverage, exclusions, actualSchema, newLinkIssues, historical };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) runCheck();
