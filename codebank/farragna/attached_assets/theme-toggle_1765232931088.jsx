"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThemeToggle = ThemeToggle;
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const theme_provider_1 = require("@/components/theme-provider");
function ThemeToggle() {
    const { theme, setTheme } = (0, theme_provider_1.useTheme)();
    return (<button_1.Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} data-testid="button-theme-toggle">
      <lucide_react_1.Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"/>
      <lucide_react_1.Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"/>
      <span className="sr-only">Toggle theme</span>
    </button_1.Button>);
}
