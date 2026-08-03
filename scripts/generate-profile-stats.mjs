import { mkdir, writeFile } from "node:fs/promises";

const token = process.env.GITHUB_TOKEN;
const login = process.env.GITHUB_LOGIN || "EslamElshikh-dev";

if (!token) {
  throw new Error("GITHUB_TOKEN is required to generate the profile statistics.");
}

const query = `
  query ProfileStatistics($login: String!) {
    user(login: $login) {
      followers {
        totalCount
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        privacy: PUBLIC
        orderBy: { field: UPDATED_AT, direction: DESC }
      ) {
        totalCount
      }
      contributionsCollection {
        contributionCalendar {
          totalContributions
        }
      }
    }
  }
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "EslamElshikh-dev-profile-stats",
  },
  body: JSON.stringify({ query, variables: { login } }),
});

if (!response.ok) {
  throw new Error(`GitHub API request failed with status ${response.status}.`);
}

const payload = await response.json();

if (payload.errors?.length) {
  throw new Error(payload.errors.map((error) => error.message).join("; "));
}

const user = payload.data?.user;

if (!user) {
  throw new Error(`GitHub user ${login} was not found.`);
}

const statistics = [
  {
    value: user.repositories.totalCount,
    english: "Public repositories",
    arabic: "المستودعات العامة",
  },
  {
    value: user.contributionsCollection.contributionCalendar.totalContributions,
    english: "Contributions · last year",
    arabic: "المساهمات · آخر سنة",
  },
  {
    value: user.followers.totalCount,
    english: "Followers",
    arabic: "المتابعون",
  },
];

const themes = {
  light: {
    background: "#ffffff",
    border: "#d0d7de",
    card: "#f6f8fa",
    title: "#1f2328",
    muted: "#57606a",
    accent: "#0969da",
  },
  dark: {
    background: "#0d1117",
    border: "#30363d",
    card: "#161b22",
    title: "#f0f6fc",
    muted: "#8b949e",
    accent: "#2f81f7",
  },
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

function buildSvg(themeName) {
  const theme = themes[themeName];
  const cardWidth = 220;
  const cardGap = 20;
  const startX = 25;

  const cards = statistics
    .map((statistic, index) => {
      const x = startX + index * (cardWidth + cardGap);
      const formattedValue = new Intl.NumberFormat("en-US").format(statistic.value);

      return `
        <g transform="translate(${x} 64)">
          <rect width="${cardWidth}" height="96" rx="14" fill="${theme.card}" stroke="${theme.border}" />
          <text x="110" y="39" class="value" text-anchor="middle">${escapeXml(formattedValue)}</text>
          <text x="110" y="64" class="label" text-anchor="middle">${escapeXml(statistic.english)}</text>
          <text x="110" y="84" class="arabic" text-anchor="middle" direction="rtl">${escapeXml(statistic.arabic)}</text>
        </g>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="750" height="185" viewBox="0 0 750 185" role="img" aria-labelledby="title description">
  <title id="title">Eslam Elshikh GitHub activity</title>
  <desc id="description">Automatically updated GitHub repositories, contributions, and follower statistics.</desc>
  <style>
    .heading { font: 700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; fill: ${theme.title}; }
    .value { font: 700 27px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; fill: ${theme.accent}; }
    .label { font: 600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; fill: ${theme.title}; }
    .arabic { font: 500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, Arial, sans-serif; fill: ${theme.muted}; }
  </style>
  <rect x="0.5" y="0.5" width="749" height="184" rx="16" fill="${theme.background}" stroke="${theme.border}" />
  <circle cx="27" cy="28" r="5" fill="${theme.accent}" />
  <text x="42" y="34" class="heading">GitHub Activity · نشاط GitHub</text>
  ${cards}
</svg>
`;
}

await mkdir("assets", { recursive: true });
await Promise.all([
  writeFile("assets/github-stats-light.svg", buildSvg("light"), "utf8"),
  writeFile("assets/github-stats-dark.svg", buildSvg("dark"), "utf8"),
]);

console.log(`Updated GitHub profile statistics for ${login}.`);
