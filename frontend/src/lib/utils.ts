import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function calculateAgingDays(issuedDate: string): number {
  const issued = new Date(issuedDate);
  const today = new Date();
  const diff = today.getTime() - issued.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export const toTitleCase = (str?: string | null): string => {
  if (!str) return "";

  return (
    str
      .trim()
      // 1. Replace underscores and dots with spaces
      .replace(/[._]/g, " ")
      // 2. Convert entire string to lowercase first
      .toLowerCase()
      // 3. Split by any amount of whitespace
      .split(/\s+/)
      // 4. Capitalize the first letter of every word
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      // 5. Join back with a single clean space
      .join(" ")
  );
};

/**
 * THE INITIALIZER
 * Optimized to work with the cleaned TitleCase name
 */
export const getInitials = (name?: string | null): string => {
  const cleanName = toTitleCase(name);
  if (!cleanName) return "U";

  const parts = cleanName.split(" ");

  // If only one name, return first letter
  if (parts.length === 1) return parts[0].charAt(0);

  // If multiple names, return first letter of First and Last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatRole = (role?: string) => {
  if (!role) return "";
  if (role === "USER") return "Project Manager";
  return role.replace("_", " ");
};
