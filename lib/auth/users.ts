import { getAuthUsers, type AuthUserRecord } from "@/lib/auth/config";
import { verifyPassword } from "@/lib/auth/password";

export function findAuthUser(username: string): AuthUserRecord | undefined {
  const normalized = username.trim().toLowerCase();
  return getAuthUsers().find((user) => user.username.toLowerCase() === normalized);
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<AuthUserRecord | null> {
  const user = findAuthUser(username);
  if (!user) return null;

  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}
