// ═══════════════════════════════════════════════════════════
// User Types
// ═══════════════════════════════════════════════════════════

export type UserRole = 'admin' | 'responder' | 'viewer';

export interface User {
  id: string; // Clerk user ID
  org_id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  slack_user_id: string | null;
  on_call: boolean;
  created_at: string;
}

export interface CreateUserInput {
  id: string; // from Clerk
  org_id: string;
  name?: string;
  email?: string;
  role?: UserRole;
  slack_user_id?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  slack_user_id?: string;
  on_call?: boolean;
}
