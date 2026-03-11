/**
 * pipeline.js — Pipeline view rendering
 */

import { extractBlockedTeam, extractDependencyIssues } from './markdown.js';
import { toggleDetail } from './detail.js';
import { hasWritePAT, getReadPAT } from './config.js';
import { teamColor, statusBadge } from './app.js';
import { fetchIssuesBatch } from './api.js';

export function renderPipeline(container, items, projectTitle) {
  const canDrag = hasWritePAT();

  container.innerHTML = `
    <div class="max-w-5xl mx-auto space-y-4">
      <div class="flex items-center justify-between mb-2">
        <div>
          <h1 class="text-2xl font-bold text-parchment" style="font-family:'Times New Roman',Times,serif;">${escapeHtml(projectTitle || 'Priority Pipeline')}</h1>
          <p class="text-sm text-muted mt-0.5" style="font-family:Arial,Helvetica,sans-serif;">
            ${items.length} journey${items.length !== 1 ? 's' : ''}
            ${canDrag ? '<span class="ml-2 text-xs text-coral font-medium">· Drag rows to reorder</span>' : ''}
          </p>
        </div>
      </div>

      <div class="hidden md:grid grid-cols-[2.5rem_1fr_9rem_6rem] gap-4 px-4 py-2 text-xs font-semibold text-muted uppercase tracking-wider" style="font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid rgba(78,99,94,0.3);">
        <div>#</div>
        <div>Journey</div>
        <div>Blocking Team</div>
        <div class="text-right">Status</div>
      </div>

      <div id="pipeline-list" class="space-y-1.5">
        ${items.map((item, index) => renderPipelineRow(item, index, canDrag)).join('')}
      </div>

      ${items.length === 0 ? `
        <div class="text-center py-16 text-muted" style="font-family:Arial,Helvetica,sans-serif;">
          <p class="text-4xl mb-4 opacity-40" style="font-family:'Times New Roman',Times,serif;">λ</p>
          <p class="text-sm">No issues found in this project</p>
        </div>
      ` : ''}
    </div>
  `;

  attachRowClickHandlers(items);
  loadAllPendingSummaries(items);
}

function renderPipelineRow(item, index, canDrag) {
  const issue = item.content;
  if (!issue) return '';

  const blockedTeam = extractBlockedTeam(issue.labels?.nodes || []);
  const repo = issue.repository?.nameWithOwner || '';
  const rankLabel = String(index + 1).padStart(2, '0');

  const teamBadgeHtml = blockedTeam
    ? `<span data-team-badge class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border"
            style="background:${teamColor(blockedTeam, 0.15)};border-color:${teamColor(blockedTeam, 0.4)};color:${teamColor(blockedTeam, 1)};font-family:Arial,Helvetica,sans-serif;">
         ${escapeHtml(blockedTeam)}
       </span>`
    : `<span data-team-badge class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
            style="background:rgba(12,43,45,0.5);color:#808C78;border:1px solid rgba(78,99,94,0.3);font-family:Arial,Helvetica,sans-serif;">
         none
       </span>`;

  return `
    <div>
      <div
        id="row-${item.id}"
        data-item-id="${item.id}"
        data-index="${index}"
        data-repo="${escapeHtml(repo)}"
        data-issue="${issue.number}"
        draggable="${canDrag}"
        class="pipeline-row grid grid-cols-[2.5rem_1fr] md:grid-cols-[2.5rem_1fr_9rem_6rem] gap-4 items-center px-4 py-3 rounded cursor-pointer transition-all select-none ${canDrag ? 'draggable-row' : ''}"
        style="background:rgba(12,43,45,0.55);border:1px solid rgba(78,99,94,0.3);border-left:3px solid ${blockedTeam ? teamColor(blockedTeam, 0.7) : 'transparent'};"
        onmouseover="this.style.background='rgba(78,99,94,0.18)'"
        onmouseout="this.style.background='rgba(12,43,45,0.55)'"
      >
        <div class="flex items-center justify-center">
          ${canDrag
            ? `<span class="drag-handle" title="Drag to reorder">⠿</span>`
            : `<span class="rank-number">${rankLabel}</span>`
          }
        </div>

        <div class="min-w-0">
          <span class="text-sm font-medium text-parchment truncate leading-snug block" style="font-family:'Times New Roman',Times,serif;">
            ${escapeHtml(issue.title)}
          </span>
          <!-- Pending work summary (populated async) -->
          <div id="pending-${item.id}" class="flex flex-wrap gap-1.5 mt-1.5 min-h-[1rem]"></div>
          <!-- Mobile: blocking team + status -->
          <div class="md:hidden flex items-center gap-2 mt-1 text-xs flex-wrap">
            ${teamBadgeHtml}
            <span class="text-muted">·</span>
            ${statusBadge(issue.state)}
          </div>
        </div>

        <div class="hidden md:flex items-center">
          ${teamBadgeHtml}
        </div>

        <div class="hidden md:flex items-center justify-end gap-2">
          ${statusBadge(issue.state)}
          <svg id="chevron-${item.id}" class="w-4 h-4 text-muted transition-all flex-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      <div id="detail-${item.id}" class="hidden rounded-b overflow-hidden -mt-1 mx-0.5" style="border:1px solid rgba(78,99,94,0.3);border-top:none;"></div>
    </div>
  `;
}

/**
 * Fetch dep issues for all items in the background and populate pending badges.
 * Handles all three states: not tracked (TODO), pending (open), done (closed).
 */
async function loadAllPendingSummaries(items) {
  const pat = getReadPAT();

  // Collect URL-based deps across all items
  const allRefs = [];
  const itemDepMap = new Map();

  for (const item of items) {
    const deps = extractDependencyIssues(item.content?.body || '');
    if (!deps.length) continue;

    const urlDeps  = deps.filter(d => d.url);
    const todoDeps = deps.filter(d => !d.url);
    const urlIndices = urlDeps.map(() => allRefs.length + urlDeps.indexOf(urlDeps[urlDeps.indexOf(urlDeps.find(x => !allRefs.includes(x)))]));

    // Simpler: track indices per item
    const startIdx = allRefs.length;
    urlDeps.forEach(d => allRefs.push({ owner: d.owner, repo: d.repo, number: d.number }));

    itemDepMap.set(item.id, { todoDeps, urlDeps, startIdx });
  }

  const results = allRefs.length ? await fetchIssuesBatch(allRefs, pat) : [];

  for (const item of items) {
    const entry = itemDepMap.get(item.id);
    if (!entry) continue;

    // team → {notTracked, pending, done}
    const teamCounts = new Map();

    const ensure = (team) => {
      if (!teamCounts.has(team)) teamCounts.set(team, { notTracked: 0, pending: 0, done: 0 });
      return teamCounts.get(team);
    };

    for (const dep of entry.todoDeps) {
      ensure(dep.team).notTracked++;
    }
    for (let i = 0; i < entry.urlDeps.length; i++) {
      const dep = entry.urlDeps[i];
      const result = results[entry.startIdx + i];
      const counts = ensure(dep.team);
      if (result?.error || result?.issue?.state === 'open') {
        counts.pending++;
      } else {
        counts.done++;
      }
    }

    const el = document.getElementById(`pending-${item.id}`);
    if (el) el.innerHTML = renderPendingBadges(teamCounts);
  }
}

function renderPendingBadges(teamCounts) {
  if (!teamCounts.size) return '';

  return [...teamCounts.entries()].map(([team, { notTracked, pending, done }]) => {
    let label, style;

    if (pending > 0) {
      const parts = [`${pending} pending`];
      if (done > 0)       parts.push(`${done} done`);
      if (notTracked > 0) parts.push(`${notTracked} not tracked`);
      label = `${team} · ${parts.join(', ')}`;
      style = `background:${teamColor(team, 0.12)};border-color:${teamColor(team, 0.35)};color:${teamColor(team, 0.9)};`;
    } else if (notTracked > 0 && done === 0) {
      label = `${team} · not tracked`;
      style = `background:rgba(14,38,24,0.4);border-color:rgba(78,99,94,0.2);color:#808C78;`;
    } else if (notTracked > 0) {
      // mixed done + not tracked
      label = `${team} · ${done} done, ${notTracked} not tracked`;
      style = `background:rgba(14,38,24,0.4);border-color:rgba(78,99,94,0.25);color:#808C78;`;
    } else {
      label = `${team} · done`;
      style = `background:rgba(14,38,24,0.5);border-color:rgba(78,99,94,0.25);color:#808C78;`;
    }

    return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs border"
                  style="${style}font-family:Arial,Helvetica,sans-serif;">${escapeHtml(label)}</span>`;
  }).join('');
}

function attachRowClickHandlers(items) {
  items.forEach(item => {
    const row = document.getElementById(`row-${item.id}`);
    if (!row) return;
    row.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      toggleDetail(item.id, item);
    });
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
