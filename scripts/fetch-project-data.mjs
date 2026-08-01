import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const owner = process.env.GITHUB_OWNER || "pierinho13";
const token = process.env.GITHUB_TOKEN || "";
const outputPath = path.resolve("assets/data/projects.json");

const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "k8sready-project-metadata"
};

if (token) {
  headers.Authorization = `Bearer ${token}`;
}

async function github(pathname, { allow404 = false } = {}) {
  const response = await fetch(`https://api.github.com${pathname}`, { headers });

  if (allow404 && response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub API ${response.status} for ${pathname}: ${body.slice(0, 240)}`);
  }

  return response.json();
}

async function readPrevious() {
  try {
    return JSON.parse(await readFile(outputPath, "utf8"));
  } catch {
    return { generatedAt: null, projects: {} };
  }
}

async function listAll(pathname, maxPages = 10) {
  const separator = pathname.includes("?") ? "&" : "?";
  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const result = await github(`${pathname}${separator}per_page=100&page=${page}`);
    items.push(...result);
    if (result.length < 100) break;
  }

  return items;
}

async function releaseData(repository) {
  const [latest, releases] = await Promise.all([
    github(`/repos/${owner}/${repository}/releases/latest`, { allow404: true }),
    listAll(`/repos/${owner}/${repository}/releases`)
  ]);

  return {
    latestRelease: latest?.tag_name || null,
    downloads: releases.reduce(
      (total, release) => total + (release.assets || []).reduce(
        (releaseTotal, asset) => releaseTotal + (asset.download_count || 0),
        0
      ),
      0
    )
  };
}

async function repositoryData(repository) {
  const [repo, releases] = await Promise.all([
    github(`/repos/${owner}/${repository}`),
    releaseData(repository)
  ]);

  return {
    repository,
    url: repo.html_url,
    stars: repo.stargazers_count,
    forks: repo.forks_count,
    openIssues: repo.open_issues_count,
    latestRelease: releases.latestRelease,
    downloads: releases.downloads,
    updatedAt: repo.pushed_at || repo.updated_at
  };
}

function normalized(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function discoverTraefikPlugins() {
  const repositories = await listAll(`/users/${owner}/repos?type=owner&sort=updated`);
  const desired = ["bulkredirects", "dynamicredirects", "responsecookies"];
  const found = [];

  for (const target of desired) {
    const match = repositories.find((repo) => normalized(repo.name).includes(target));
    if (match && !found.some((repo) => repo.name === match.name)) {
      found.push(match);
    }
  }

  return found;
}

async function aggregateTraefikPlugins() {
  const repositories = await discoverTraefikPlugins();
  const releaseResults = await Promise.all(
    repositories.map(async (repo) => ({ repo, releases: await releaseData(repo.name) }))
  );

  const latestRepository = [...repositories].sort(
    (a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at)
  )[0];

  const latestRelease = releaseResults
    .filter((item) => item.releases.latestRelease)
    .sort((a, b) => new Date(b.repo.pushed_at || b.repo.updated_at) - new Date(a.repo.pushed_at || a.repo.updated_at))[0];

  return {
    repositories: repositories.map((repo) => repo.name),
    repositoryCount: repositories.length,
    stars: repositories.reduce((total, repo) => total + repo.stargazers_count, 0),
    forks: repositories.reduce((total, repo) => total + repo.forks_count, 0),
    openIssues: repositories.reduce((total, repo) => total + repo.open_issues_count, 0),
    latestRelease: latestRelease?.releases.latestRelease || null,
    downloads: releaseResults.reduce((total, item) => total + item.releases.downloads, 0),
    updatedAt: latestRepository?.pushed_at || latestRepository?.updated_at || null
  };
}

const previous = await readPrevious();
const projects = { ...(previous.projects || {}) };

const definitions = [
  ["github-platform-operator", "github-platform-operator"],
  ["kubectl-peek", "kubectl-peek"],
  ["cmdpeek", "cmdpeek"]
];

for (const [key, repository] of definitions) {
  try {
    projects[key] = await repositoryData(repository);
    console.log(`Updated ${key}`);
  } catch (error) {
    console.warn(`Could not update ${key}; keeping previous data. ${error.message}`);
  }
}

try {
  const aggregate = await aggregateTraefikPlugins();
  if (aggregate.repositoryCount > 0) {
    projects["traefik-plugins"] = aggregate;
    console.log(`Updated traefik-plugins from ${aggregate.repositoryCount} repositories`);
  } else {
    console.warn("No Traefik plugin repositories were discovered; keeping previous data.");
  }
} catch (error) {
  console.warn(`Could not update traefik-plugins; keeping previous data. ${error.message}`);
}

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(
  outputPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), projects }, null, 2)}\n`,
  "utf8"
);
