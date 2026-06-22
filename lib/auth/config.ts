export const SESSION_COOKIE_NAME = "ortiz_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 días

export function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret && secret.length >= 32 ? secret : null;
}

export function isAuthConfigured(): boolean {
  return getAuthSecret() !== null && loadAuthUsersRaw().length > 0;
}

export type AuthUserRecord = {
  username: string;
  passwordHash: string;
};

function loadAuthUsersRaw(): AuthUserRecord[] {
  const raw = process.env.AUTH_USERS?.trim();
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is AuthUserRecord =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as AuthUserRecord).username === "string" &&
        typeof (entry as AuthUserRecord).passwordHash === "string" &&
        (entry as AuthUserRecord).username.length > 0 &&
        (entry as AuthUserRecord).passwordHash.length > 0,
    );
  } catch {
    return [];
  }
}

export function getAuthUsers(): AuthUserRecord[] {
  return loadAuthUsersRaw();
}
