export type UserRole = 'admin' | 'user';

export interface AuthUser {
  username: string;
  name: string;
  role: UserRole;
}

const CREDENTIALS = [
  { username: 'xshadow98', password: 'pakistan47', name: 'M.Shafique', role: 'admin' as UserRole },
  { username: 'staff01',   password: 'staff123',   name: 'Staff',      role: 'user'  as UserRole },
];

export function validateCredentials(username: string, password: string): AuthUser | null {
  const match = CREDENTIALS.find(c => c.username === username && c.password === password);
  if (!match) return null;
  return { username: match.username, name: match.name, role: match.role };
}

export const USER_PATHS  = ['/pos', '/inventory', '/purchases'];
export const ADMIN_PATHS = ['/dashboard', '/sales-history', '/profits', '/reports', '/settings'];
export const ALL_PATHS   = [...USER_PATHS, ...ADMIN_PATHS];
