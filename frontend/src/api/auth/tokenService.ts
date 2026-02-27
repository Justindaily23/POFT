// @/api/tokenService.ts
export const tokenService = {
  getToken: () => localStorage.getItem("access_token"), // Persistent
  setToken: (token: string) => localStorage.setItem("access_token", token),
  clearToken: () => localStorage.removeItem("access_token"),
};
