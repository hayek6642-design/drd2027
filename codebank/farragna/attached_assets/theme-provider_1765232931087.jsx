"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeProvider = ThemeProvider;
exports.useTheme = useTheme;
const react_1 = require("react");
const ThemeProviderContext = (0, react_1.createContext)(undefined);
function ThemeProvider({ children }) {
    const [theme, setTheme] = (0, react_1.useState)(() => {
        if (typeof window !== "undefined") {
            const stored = localStorage.getItem("farragna-theme");
            return stored || "dark";
        }
        return "dark";
    });
    (0, react_1.useEffect)(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(theme);
        localStorage.setItem("farragna-theme", theme);
    }, [theme]);
    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };
    return (<ThemeProviderContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeProviderContext.Provider>);
}
function useTheme() {
    const context = (0, react_1.useContext)(ThemeProviderContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
