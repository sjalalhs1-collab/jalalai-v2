export const DEFAULT_PERMISSIONS = { web: true, files: false, code: false, externalActions: false, sensitiveData: false };
export function canExecute(p, s) { return s[p] === true; }
