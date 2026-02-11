import { ThemeProvider as NextThemesProvider } from "next-themes";

// In Vite, we import the types directly from the package
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
