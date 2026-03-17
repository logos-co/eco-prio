/**
 * markdown.js — Markdown rendering and dependency parsing
 *
 * Expected dependency format in issue body:
 *
 *   ## Dependencies
 *   - team name: https://github.com/owner/repo/issues/123
 *   - team name: https://github.com/owner/repo/issues/123 15Mar26
 *   - team name: https://example.com/some-reference
 *   - team name: https://example.com/ref Completed
 *   - team name: Completed
 *   - team name: Completed 15Mar26
 *   - team name: TODO
 *   - team name: TODO 15Mar26
 *   - team name:
 *   - lez: https://github.com/logos-blockchain/logos-execution-zone/issues/45
 */

/**
 * Render markdown to HTML using marked.js (available from CDN as window.marked).
 */
export function renderMarkdown(text) {
  if (!text) return '<em class="text-muted" style="font-family:Arial,Helvetica,sans-serif;">No description provided.</em>';
  if (typeof marked === 'undefined') {
    return `<pre class="whitespace-pre-wrap text-sm text-warmgray">${escapeHtml(text)}</pre>`;
  }
  marked.setOptions({ breaks: true, gfm: true });
  return marked.parse(text);
}

/**
 * Extract the raw text of the ## Dependencies section from an issue body.
 * Returns empty string if no such section exists.
 */
function extractDepsSection(body) {
  if (!body) return '';
  const headingMatch = body.match(/^#{1,3}\s+Dependencies[ \t]*\r?\n/m);
  if (!headingMatch) return '';
  const startIdx = headingMatch.index + headingMatch[0].length;
  const rest = body.slice(startIdx);
  const nextHeading = rest.match(/^#{1,3}\s/m);
  return nextHeading ? rest.slice(0, nextHeading.index) : rest;
}

/**
 * Parse dependencies from an issue body.
 * Only reads from the ## Dependencies section.
 *
 * Returns Array<{
 *   team: string,
 *   url: string|null,       — URL (GitHub issue or any reference), or null
 *   owner: string|null,     — GitHub issue owner (null for non-GitHub URLs)
 *   repo: string|null,      — GitHub issue repo (null for non-GitHub URLs)
 *   number: number|null,    — GitHub issue number (null for non-GitHub URLs)
 *   completed: boolean,     — true if "Completed" flag is set
 *   targetDate: string|null, — DDMMMYY date string, or null
 * }>
 */
export function extractDependencyIssues(body) {
  const section = extractDepsSection(body);
  if (!section) return [];

  const deps = [];
  // Match lines like:  - team name: VALUE  (value may be empty)
  const lineRe = /^-[ \t]+([^:\r\n]+):[ \t]*(.*?)$/gm;
  // DDMMMYY pattern, e.g. 15Mar26
  const dateRe = /\b(\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2})\s*$/i;
  // Completed flag at end of value (after URL or standalone)
  const completedRe = /\bCompleted\s*$/i;
  let m;
  while ((m = lineRe.exec(section)) !== null) {
    const team = m[1].trim();
    let value = (m[2] || '').trim();

    if (!team) continue;

    // 1. Extract optional trailing date
    const dateM = value.match(dateRe);
    const targetDate = dateM ? dateM[1] : null;
    if (dateM) value = value.slice(0, dateM.index).trim();

    // 2. Extract optional trailing "Completed" flag
    const completed = completedRe.test(value);
    if (completed) value = value.replace(completedRe, '').trim();

    // 3. Remaining value is URL or "TODO" or empty
    if (value.toUpperCase() === 'TODO' || value === '') {
      deps.push({ team, url: null, owner: null, repo: null, number: null, completed, targetDate });
    } else {
      const ghM = value.match(/https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/);
      if (ghM) {
        deps.push({ team, url: value, owner: ghM[1], repo: ghM[2], number: parseInt(ghM[3], 10), completed, targetDate });
      } else if (/^https?:\/\/\S+$/.test(value)) {
        deps.push({ team, url: value, owner: null, repo: null, number: null, completed, targetDate });
      }
      // Lines with unrecognised values are silently skipped
    }
  }
  return deps;
}

/**
 * Parse a DDMMMYY string into a Date object. Returns null if invalid.
 */
export function parseDDMMMYY(str) {
  if (!str) return null;
  const m = str.match(/^(\d{2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(\d{2})$/i);
  if (!m) return null;
  const months = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  const day = parseInt(m[1], 10);
  const month = months[m[2].toLowerCase()];
  const year = 2000 + parseInt(m[3], 10);
  if (month === undefined || day < 1 || day > 31) return null;
  return new Date(year, month, day);
}

/**
 * Return a CSS color for a target date:
 * - red (#E46962) if past delivery
 * - orange (#FA7B17) if within 7 days of delivery
 * - null otherwise (use default color)
 */
export function targetDateColor(dateStr) {
  const d = parseDDMMMYY(dateStr);
  if (!d) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diff = d.getTime() - now.getTime();
  const days = diff / (1000 * 60 * 60 * 24);
  if (days < 0) return '#E46962';   // past due — red
  if (days <= 7) return '#FA7B17';  // within 1 week — orange
  return null;
}

/**
 * Update the target date on a specific dependency line in the issue body.
 * Matches by team name (case-insensitive). If newDate is null/empty, removes the date.
 *
 * @param {string} body     — current issue body
 * @param {string} team     — team name to match
 * @param {string|null} newDate — DDMMMYY string, or null to remove
 * @returns {string} updated body
 */
export function setDepDate(body, team, newDate) {
  const headingMatch = body.match(/^(#{1,3}\s+Dependencies[ \t]*\r?\n)/m);
  if (!headingMatch) return body;

  const startIdx = headingMatch.index + headingMatch[0].length;
  const rest = body.slice(startIdx);
  const nextHeading = rest.match(/^#{1,3}\s/m);
  const sectionEnd = nextHeading ? nextHeading.index : rest.length;
  const section = rest.slice(0, sectionEnd);

  const dateRe = /\s+\d{2}(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\d{2}\s*$/i;
  const lines = section.split('\n');
  const updated = lines.map(line => {
    const m = line.match(/^-[ \t]+([^:\r\n]+):/);
    if (!m || m[1].trim().toLowerCase() !== team.toLowerCase()) return line;
    // Strip existing date if present
    let cleaned = line.replace(dateRe, '');
    // Append new date
    if (newDate) cleaned = cleaned.trimEnd() + ' ' + newDate;
    return cleaned;
  });

  return body.slice(0, startIdx) + updated.join('\n') + body.slice(startIdx + sectionEnd);
}

/**
 * Add a dependency entry to the issue body.
 * Appends under existing ## Dependencies section, or creates the section.
 *
 * @param {string} body        — current issue body
 * @param {string} team        — team name
 * @param {string|null} url    — URL, "Completed", or null → writes "TODO"
 * @param {string|null} date   — optional target date in DDMMMYY format
 * @returns {string} updated body
 */
export function addDepToBody(body, team, url, date) {
  const dateSuffix = date ? ` ${date}` : '';
  const line = `- ${team}: ${url || 'TODO'}${dateSuffix}`;
  const section = extractDepsSection(body);

  if (section !== '') {
    // Collect existing dep lines and append the new one
    const depLines = section.split('\n').filter(l => /^-\s/.test(l));
    depLines.push(line);
    const newSection = depLines.join('\n') + '\n';

    // Replace old section content with cleaned-up version
    const headingMatch = body.match(/^(#{1,3}\s+Dependencies[ \t]*\r?\n)/m);
    const startIdx = headingMatch.index + headingMatch[0].length;
    const rest = body.slice(startIdx);
    const nextHeading = rest.match(/^#{1,3}\s/m);
    const endIdx = nextHeading ? startIdx + nextHeading.index : body.length;

    return body.slice(0, startIdx) + newSection + body.slice(endIdx);
  }
  return `${(body || '').trimEnd()}\n\n## Dependencies\n${line}\n`;
}

/**
 * Extract the documentation URL from a ## Documentation section in an issue body.
 * Returns the first URL found, or null.
 */
export function hasDocsDependency(body) {
  const deps = extractDependencyIssues(body);
  return deps.some(d => d.team.toLowerCase() === 'docs');
}

export function extractDocUrl(body) {
  if (!body) return null;
  const headingMatch = body.match(/^#{1,3}\s+Documentation[ \t]*\r?\n/m);
  if (!headingMatch) return null;
  const startIdx = headingMatch.index + headingMatch[0].length;
  const rest = body.slice(startIdx);
  const nextHeading = rest.match(/^#{1,3}\s/m);
  const section = nextHeading ? rest.slice(0, nextHeading.index) : rest;
  const urlMatch = section.match(/https?:\/\/\S+/);
  return urlMatch ? urlMatch[0].replace(/[)\].,;>]+$/, '') : null;
}

/**
 * Extract blocked:* label from an array of label nodes.
 */
export function extractBlockedTeam(labels) {
  if (!labels || !labels.length) return null;
  for (const label of labels) {
    const m = label.name.match(/^blocked:(.+)$/i);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Get all blocked:* labels from an array of label nodes.
 */
export function extractAllBlockedLabels(labels) {
  if (!labels || !labels.length) return [];
  return labels
    .filter(l => /^blocked:/i.test(l.name))
    .map(l => ({
      name: l.name,
      team: l.name.replace(/^blocked:/i, '').trim(),
      color: l.color,
    }));
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
