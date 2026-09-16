import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("public site chrome shares a 72rem max-width shell", () => {
  const shell = read("src/lib/site-shell.ts");
  assert.match(shell, /max-w-6xl/);
  assert.match(shell, /SITE_SHELL_CLASS/);

  const files = [
    "src/app/[locale]/layout.tsx",
    "src/components/site-header.tsx",
    "src/components/site-footer.tsx",
    "src/components/onboarding-card.tsx",
    "src/components/wall-board.tsx",
  ];

  for (const file of files) {
    const src = read(file);
    assert.match(src, /SITE_SHELL_CLASS/, `${file} should use SITE_SHELL_CLASS`);
    assert.doesNotMatch(src, /max-w-3xl/, `${file} should not keep the old max-w-3xl shell`);
  }
});

test("desktop header pill spans the site shell instead of a nested island", () => {
  const header = read("src/components/site-header.tsx");
  assert.match(header, /SITE_SHELL_CLASS/);
  assert.match(header, /rounded-full/);
  assert.match(header, /bg-paper/);
  assert.doesNotMatch(
    header,
    /nav[\s\S]*rounded-full bg-paper/,
    "nav should not be the only paper pill; the bar itself should grow",
  );
});

test("homepage hero uses a wider two-column layout on large screens", () => {
  const home = read("src/app/[locale]/page.tsx");
  assert.match(home, /lg:gap-16/);
  assert.match(home, /lg:max-w-xl/);
  assert.match(home, /lg:max-w-\[22rem\]/);
});
