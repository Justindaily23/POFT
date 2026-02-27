export const toTitleCase = (str?: string | null): string => {
  if (!str) return '';

  return (
    str
      .trim()
      // 1. Replace underscores and dots with spaces
      .replace(/[._]/g, ' ')
      // 2. Convert entire string to lowercase first
      .toLowerCase()
      // 3. Split by any amount of whitespace
      .split(/\s+/)
      // 4. Capitalize the first letter of every word
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      // 5. Join back with a single clean space
      .join(' ')
  );
};

/**
 * THE INITIALIZER
 * Optimized to work with the cleaned TitleCase name
 */
export const getInitials = (name?: string | null): string => {
  const cleanName = toTitleCase(name);
  if (!cleanName) return 'U';

  const parts = cleanName.split(' ');

  // If only one name, return first letter
  if (parts.length === 1) return parts[0].charAt(0);

  // If multiple names, return first letter of First and Last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const formatRole = (role?: string) => {
  if (!role) return '';
  if (role === 'USER') return 'Project Manager';
  return role.replace('_', ' ');
};
