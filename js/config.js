/**
 * config.js — Config load/save via localStorage
 * Keys: ppd_owner, ppd_project_number, ppd_pat_read, ppd_pat_write
 */

const KEYS = {
  OWNER:          'ppd_owner',
  PROJECT_NUMBER: 'ppd_project_number',
  PAT_READ:       'ppd_pat_read',
  PAT_WRITE:      'ppd_pat_write',
};

// Default project: logos-co / project 12
const DEFAULTS = {
  owner: 'logos-co',
  projectNumber: 12,
};

// Migrate old single-PAT key → write PAT
function migrate() {
  const old = localStorage.getItem('ppd_pat');
  if (old && !localStorage.getItem(KEYS.PAT_WRITE)) {
    localStorage.setItem(KEYS.PAT_WRITE, old);
  }
  if (old) localStorage.removeItem('ppd_pat');
}

export function getConfig() {
  migrate();
  return {
    owner:         localStorage.getItem(KEYS.OWNER) || DEFAULTS.owner,
    projectNumber: parseInt(localStorage.getItem(KEYS.PROJECT_NUMBER) || '0', 10) || DEFAULTS.projectNumber,
    patRead:       localStorage.getItem(KEYS.PAT_READ)  || '',
    patWrite:      localStorage.getItem(KEYS.PAT_WRITE) || '',
  };
}

/** Best available PAT for read operations (write PAT has all scopes, use it if available). */
export function getReadPAT() {
  const { patRead, patWrite } = getConfig();
  return patWrite || patRead || '';
}

/** Write PAT only — required for mutations. */
export function getWritePAT() {
  return getConfig().patWrite || '';
}

export function saveConfig({ owner, projectNumber, patRead, patWrite }) {
  if (owner !== undefined) {
    if (owner) localStorage.setItem(KEYS.OWNER, owner.trim());
    else        localStorage.removeItem(KEYS.OWNER);
  }
  if (projectNumber !== undefined) {
    if (projectNumber) localStorage.setItem(KEYS.PROJECT_NUMBER, String(projectNumber));
    else               localStorage.removeItem(KEYS.PROJECT_NUMBER);
  }
  if (patRead !== undefined) {
    if (patRead) localStorage.setItem(KEYS.PAT_READ, patRead.trim());
    else         localStorage.removeItem(KEYS.PAT_READ);
  }
  if (patWrite !== undefined) {
    if (patWrite) localStorage.setItem(KEYS.PAT_WRITE, patWrite.trim());
    else          localStorage.removeItem(KEYS.PAT_WRITE);
  }
}

export function clearConfig() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k));
}

export function isConfigured() {
  const { owner, projectNumber } = getConfig();
  return Boolean(owner && projectNumber);
}

/** True if any PAT is set (enables authenticated reads). */
export function hasPAT() {
  return Boolean(getReadPAT());
}

/** True only if write PAT is set (enables mutations). */
export function hasWritePAT() {
  return Boolean(getWritePAT());
}
