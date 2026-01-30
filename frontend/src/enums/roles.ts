export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  PM: "PM",
} as const;

// optional type-safe version
export type RoleName = (typeof ROLES)[keyof typeof ROLES];
