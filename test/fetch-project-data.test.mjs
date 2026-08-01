import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import {
  htmlToText,
  listAll,
  normalized,
  parsePackageDownloads,
  releaseData
} from "../scripts/fetch-project-data.mjs";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("htmlToText removes executable markup and decodes common entities", () => {
  const html = `
    <style>.hidden { display: none }</style>
    <p>Charts&nbsp;&amp; tools &#x1F680;</p>
    <script>alert("ignored")</script>
  `;

  assert.equal(htmlToText(html), "Charts & tools 🚀");
});

test("parsePackageDownloads reads the visible GitHub total", () => {
  assert.equal(
    parsePackageDownloads("<strong>Total downloads</strong> 12,345 <span>versions</span>"),
    12345
  );
});

test("parsePackageDownloads falls back to embedded JSON", () => {
  assert.equal(parsePackageDownloads('<script>{"totalDownloads":9876}</script>'), 9876);
  assert.equal(parsePackageDownloads('{"total_downloads":42}'), 42);
});

test("parsePackageDownloads rejects pages without a download metric", () => {
  assert.throws(
    () => parsePackageDownloads("<main>Package unavailable</main>"),
    /Total downloads/
  );
});

test("normalized makes repository matching punctuation-insensitive", () => {
  assert.equal(normalized("Traefik-Dynamic_Redirects.go"), "traefikdynamicredirectsgo");
});

test("listAll follows full pages and preserves existing query parameters", async () => {
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    const page = new URL(url).searchParams.get("page");
    const items = page === "1"
      ? Array.from({ length: 100 }, (_, index) => ({ id: index }))
      : [{ id: 100 }];
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  };

  const items = await listAll("/users/example/repos?sort=updated");

  assert.equal(items.length, 101);
  assert.match(requestedUrls[0], /sort=updated&per_page=100&page=1$/);
  assert.match(requestedUrls[1], /sort=updated&per_page=100&page=2$/);
});

test("releaseData tolerates no latest release and totals every asset download", async () => {
  globalThis.fetch = async (url) => {
    const pathname = new URL(url).pathname;
    if (pathname.endsWith("/releases/latest")) {
      return new Response("not found", { status: 404 });
    }
    return new Response(JSON.stringify([
      { assets: [{ download_count: 5 }, { download_count: 7 }] },
      { assets: [{ download_count: 3 }] },
      {}
    ]), { status: 200, headers: { "content-type": "application/json" } });
  };

  assert.deepEqual(await releaseData("example"), {
    latestRelease: null,
    downloads: 15
  });
});

test("listAll reports useful GitHub API errors", async () => {
  globalThis.fetch = async () => new Response("rate limited", { status: 403 });

  await assert.rejects(
    listAll("/users/example/repos"),
    /GitHub API 403.*rate limited/
  );
});
