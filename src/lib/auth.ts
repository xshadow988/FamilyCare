export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  name: string;
  role: UserRole;
  /** Demo accounts never touch the production database — see lib/demo-store.ts */
  isDemo?: boolean;
  /**
   * When this demo session began. The 24h expiry is anchored here rather than
   * to the sandbox data, because the data can be cleared independently (and is,
   * by whichever provider mounts first) which would hide the expiry.
   */
  demoStartedAt?: number;
}

const CREDENTIALS = [
  { username: 'Admin',   password: 'pakistan47',    name: 'M.Shafique', role: 'admin' as UserRole },
  { username: 'staff01', password: 'staffaccess01', name: 'Staff',      role: 'user'  as UserRole },
  // Sandbox account for product demos. Starts empty, stores everything in the
  // browser, and is wiped on logout / after 24h. Never reaches Neon.
  { username: 'demo',    password: 'demo1234',      name: 'Demo User',  role: 'admin' as UserRole, isDemo: true },
];

export function validateCredentials(username: string, password: string): AuthUser | null {
  const match = CREDENTIALS.find(c => c.username === username && c.password === password);
  if (!match) return null;
  return { username: match.username, name: match.name, role: match.role, isDemo: match.isDemo ?? false };
}

/** True when the stored session belongs to a demo account. */
export function isDemoSession(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem('fc_auth');
    return raw ? JSON.parse(raw)?.isDemo === true : false;
  } catch {
    return false;
  }
}

export const USER_PATHS  = ['/pos', '/inventory', '/purchases'];
export const ADMIN_PATHS = ['/dashboard', '/sales-history', '/profits', '/reports', '/settings'];
export const ALL_PATHS   = [...USER_PATHS, ...ADMIN_PATHS];
