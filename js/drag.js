/**
 * drag.js — HTML5 drag-and-drop reordering for pipeline rows
 */

import { moveProjectItem } from './api.js';
import { showToast } from './app.js';

let dragSrcIndex = null;
let onReorderCallback = null;
let projectId = null;
let itemsRef = null;
let patRef = null;
let dropIndicator = null;
let listEl = null;

/**
 * Initialise drag-and-drop on the pipeline list.
 * @param {Object} options
 * @param {string} options.projectId - GitHub project ID
 * @param {Array} options.items - mutable items array (open items only)
 * @param {string} options.pat - PAT for write
 * @param {Function} options.onReorder - called after successful reorder with updated items
 */
export function initDrag({ projectId: pid, items, pat, onReorder }) {
  projectId = pid;
  itemsRef = items;
  patRef = pat;
  onReorderCallback = onReorder;

  listEl = document.getElementById('pipeline-list');
  if (!listEl) return;

  ensureDropIndicator();
  attachDragHandlers();
  attachContainerHandlers();
}

function ensureDropIndicator() {
  if (dropIndicator && dropIndicator.parentNode) return;
  dropIndicator = document.createElement('div');
  dropIndicator.className = 'drop-indicator';
  dropIndicator.style.display = 'none';
}

function showIndicatorAt(refEl, position) {
  if (!dropIndicator || !refEl?.parentNode) return;
  dropIndicator.style.display = 'block';
  if (position === 'before') {
    refEl.parentNode.insertBefore(dropIndicator, refEl);
  } else {
    refEl.parentNode.insertBefore(dropIndicator, refEl.nextSibling);
  }
}

function hideIndicator() {
  if (dropIndicator) dropIndicator.style.display = 'none';
}

/** Get all row wrapper divs (parent of .pipeline-row) in order. */
function getRowWrappers() {
  if (!listEl) return [];
  return [...listEl.querySelectorAll('[draggable="true"]')].map(r => r.parentElement);
}

/**
 * Given a clientY, determine the insertion slot (0..N).
 * Slot i means "insert before item i"; slot N means "append at end".
 */
function slotFromY(clientY) {
  const wrappers = getRowWrappers();
  for (let i = 0; i < wrappers.length; i++) {
    const rect = wrappers[i].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) return i;
  }
  return wrappers.length;
}

function attachDragHandlers() {
  const rows = listEl.querySelectorAll('[draggable="true"]');
  rows.forEach(row => {
    if (row._dragInitialised) return;
    row._dragInitialised = true;

    row.addEventListener('dragstart', handleDragStart);
    row.addEventListener('dragend', handleDragEnd);
  });
}

function attachContainerHandlers() {
  if (listEl._dragContainerInit) return;
  listEl._dragContainerInit = true;

  listEl.addEventListener('dragover', handleContainerDragOver);
  listEl.addEventListener('drop', handleContainerDrop);
  listEl.addEventListener('dragleave', handleContainerDragLeave);
}

function handleDragStart(e) {
  dragSrcIndex = parseInt(this.dataset.index, 10);
  this.classList.add('drag-source');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(dragSrcIndex));
}

function handleDragEnd() {
  this.classList.remove('drag-source');
  hideIndicator();
  dragSrcIndex = null;
}

function handleContainerDragOver(e) {
  if (dragSrcIndex === null) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const slot = slotFromY(e.clientY);
  const wrappers = getRowWrappers();

  // Don't show indicator at the source row's current position (no-op drop)
  if (slot === dragSrcIndex || slot === dragSrcIndex + 1) {
    hideIndicator();
    return;
  }

  if (slot >= wrappers.length) {
    showIndicatorAt(wrappers[wrappers.length - 1], 'after');
  } else {
    showIndicatorAt(wrappers[slot], 'before');
  }
}

function handleContainerDragLeave(e) {
  // Only hide if actually leaving the container
  if (!listEl.contains(e.relatedTarget)) {
    hideIndicator();
  }
}

async function handleContainerDrop(e) {
  e.preventDefault();
  hideIndicator();

  if (dragSrcIndex === null) return;

  const slot = slotFromY(e.clientY);
  if (isNaN(dragSrcIndex) || isNaN(slot)) return;

  // Convert slot to insertion index after removing the source
  let insertIdx;
  if (dragSrcIndex < slot) {
    insertIdx = slot - 1;
  } else {
    insertIdx = slot;
  }

  if (dragSrcIndex === insertIdx) return;

  // Reorder the open items array
  const items = itemsRef;
  const [moved] = items.splice(dragSrcIndex, 1);
  items.splice(insertIdx, 0, moved);

  // afterId: the item just before the moved item, or null if moved to top
  const afterItemId = insertIdx === 0 ? null : items[insertIdx - 1].id;

  // Reorder DOM nodes in-place (no full re-render, avoids flash)
  const wrappers = getRowWrappers();
  const srcWrapper = wrappers[dragSrcIndex];
  if (srcWrapper) {
    // Determine reference node: insert before the element currently at insertIdx
    // (after the source has been conceptually removed)
    const remaining = wrappers.filter((_, i) => i !== dragSrcIndex);
    if (insertIdx >= remaining.length) {
      // Append after last wrapper
      const last = remaining[remaining.length - 1];
      last.parentNode.insertBefore(srcWrapper, last.nextSibling);
    } else {
      remaining[insertIdx].parentNode.insertBefore(srcWrapper, remaining[insertIdx]);
    }
    // Update data-index attributes and rank numbers
    updateRowIndices();
  }

  // Update state without re-rendering
  if (onReorderCallback) {
    onReorderCallback([...items], true);
  }

  // Write to GitHub
  try {
    await moveProjectItem(projectId, moved.id, afterItemId, patRef);
  } catch (err) {
    showToast('error', `Failed to save order: ${err.message}`);
    // Revert — do a full re-render since DOM is already moved
    items.splice(insertIdx, 1);
    items.splice(dragSrcIndex, 0, moved);
    if (onReorderCallback) {
      onReorderCallback([...items], false);
    }
  }
}

function updateRowIndices() {
  if (!listEl) return;
  const rows = listEl.querySelectorAll('[draggable="true"]');
  rows.forEach((row, i) => {
    row.dataset.index = String(i);
    // Update rank number if visible
    const rank = row.querySelector('.rank-number');
    if (rank) rank.textContent = String(i + 1).padStart(2, '0');
  });
}
