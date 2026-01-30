// @/api/tokenService.ts
export const tokenService = {
    getToken: () => localStorage.getItem("access_token"), // Persistent
    setToken: (token: string) => localStorage.setItem("access_token", token),
    clearToken: () => localStorage.removeItem("access_token"),
};

// let inMemoryToken: string | null = null;

// export const tokenService = {
//   getToken: () => inMemoryToken,
//   setToken: (token: string) => {
//     inMemoryToken = token;
//   },
//   clearToken: () => {
//     inMemoryToken = null;
//   },
// };

// tokenService.ts

// export const tokenService = {
//     getToken: () => {
//         // Check if we are in a browser environment
//         if (typeof window !== "undefined") {
//             return localStorage.getItem("access_token");
//         }
//         return null;
//     },

//     setToken: (token: string) => {
//         localStorage.setItem("access_token", token);
//     },

//     clearToken: () => {
//         localStorage.removeItem("access_token");
//     },
// };
