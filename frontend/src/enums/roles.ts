export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PM: "USER",
} as const;

// optional type-safe version
export type RoleName = (typeof ROLES)[keyof typeof ROLES];
