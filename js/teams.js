/**
 * teams.js — Repo-to-team display name mapping
 */

export const REPO_TEAMS = {
  'logos-co/ecosystem':                    'dogfooding',
  'logos-co/logos-docs':                   'docs',
  'logos-blockchain/logos-execution-zone': 'lez',
};

/**
 * Return display team name for a given "owner/repo" string.
 * Falls back to the repo name portion if no mapping exists.
 * @param {string} ownerRepo  e.g. "logos-co/ecosystem"
 * @returns {string}
 */
export function repoToTeam(ownerRepo) {
  return REPO_TEAMS[ownerRepo] ?? ownerRepo.split('/')[1];
}
