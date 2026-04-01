import { createContext, useContext, useEffect, useState } from "react";

const ThemeProviderContext = createContext(undefined);

export function ThemeProvider({ children, defaultTheme = "dark", storageKey = "e7ki-theme", }) {
    const [theme, setThemeState] = useState(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem(storageKey);
            return stored || defaultTheme;
        }
        return defaultTheme;
    });

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem(storageKey, theme);
    }, [theme, storageKey]);

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
    };

    const toggleTheme = () => {
        setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    };

    return (
        <ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeProviderContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
