"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const button_1 = require("@/components/ui/button");
const input_1 = require("@/components/ui/input");
const avatar_1 = require("@/components/ui/avatar");
const dropdown_menu_1 = require("@/components/ui/dropdown-menu");
const theme_provider_1 = require("@/components/theme-provider");
const useAuth_1 = require("@/hooks/useAuth");
function Header({ onUploadClick, onFavoritesClick, onAdminClick, onSearch, }) {
    var _a, _b, _c, _d, _e, _f;
    const { theme, toggleTheme } = (0, theme_provider_1.useTheme)();
    const { user, isAuthenticated } = (0, useAuth_1.useAuth)();
    const [logoClickCount, setLogoClickCount] = (0, react_1.useState)(0);
    const [showSearch, setShowSearch] = (0, react_1.useState)(false);
    const [searchQuery, setSearchQuery] = (0, react_1.useState)("");
    const handleLogoClick = (0, react_1.useCallback)(() => {
        const newCount = logoClickCount + 1;
        setLogoClickCount(newCount);
        if (newCount >= 7) {
            onAdminClick();
            setLogoClickCount(0);
        }
        setTimeout(() => {
            setLogoClickCount((prev) => (prev === newCount ? 0 : prev));
        }, 2000);
    }, [logoClickCount, onAdminClick]);
    const handleSearch = (0, react_1.useCallback)((e) => {
        e.preventDefault();
        onSearch === null || onSearch === void 0 ? void 0 : onSearch(searchQuery);
    }, [searchQuery, onSearch]);
    const clearSearch = (0, react_1.useCallback)(() => {
        setSearchQuery("");
        onSearch === null || onSearch === void 0 ? void 0 : onSearch("");
        setShowSearch(false);
    }, [onSearch]);
    return (<header className="fixed top-0 left-0 right-0 h-20 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="h-full px-5 flex items-center justify-between gap-4">
        <button onClick={handleLogoClick} className="relative group flex items-center gap-2" data-testid="button-logo">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent select-none">
            Farragna
          </h1>
          <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity -z-10"/>
          {logoClickCount > 0 && logoClickCount < 7 && (<div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full">
              <div className="h-full bg-accent rounded-full transition-all duration-200" style={{ width: `${(logoClickCount / 7) * 100}%` }}/>
            </div>)}
        </button>

        <div className="flex-1 flex justify-center">
          {showSearch ? (<form onSubmit={handleSearch} className="w-full max-w-md flex gap-2">
              <div className="relative flex-1">
                <lucide_react_1.Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
                <input_1.Input type="search" placeholder="Search videos..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-8" autoFocus data-testid="input-search"/>
                {searchQuery && (<button type="button" onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <lucide_react_1.X className="w-4 h-4"/>
                  </button>)}
              </div>
              <button_1.Button type="submit" size="default" data-testid="button-search-submit">
                Search
              </button_1.Button>
            </form>) : (<button_1.Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} data-testid="button-search-toggle">
              <lucide_react_1.Search className="w-5 h-5"/>
            </button_1.Button>)}
        </div>

        <div className="flex items-center gap-3">
          <button_1.Button variant="default" onClick={onUploadClick} className="gap-2" data-testid="button-upload">
            <lucide_react_1.Upload className="w-4 h-4"/>
            <span className="hidden sm:inline">Upload</span>
          </button_1.Button>

          <button_1.Button variant="ghost" size="icon" onClick={onFavoritesClick} className="relative" data-testid="button-favorites">
            <lucide_react_1.Heart className="w-5 h-5"/>
          </button_1.Button>

          <button_1.Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
            {theme === "dark" ? (<lucide_react_1.Sun className="w-5 h-5"/>) : (<lucide_react_1.Moon className="w-5 h-5"/>)}
          </button_1.Button>

          {isAuthenticated && user && (<dropdown_menu_1.DropdownMenu>
              <dropdown_menu_1.DropdownMenuTrigger asChild>
                <button_1.Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" data-testid="button-user-menu">
                  <avatar_1.Avatar className="h-9 w-9">
                    <avatar_1.AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"}/>
                    <avatar_1.AvatarFallback>
                      {((_a = user.firstName) === null || _a === void 0 ? void 0 : _a[0]) || ((_c = (_b = user.email) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.toUpperCase()) || "U"}
                    </avatar_1.AvatarFallback>
                  </avatar_1.Avatar>
                </button_1.Button>
              </dropdown_menu_1.DropdownMenuTrigger>
              <dropdown_menu_1.DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-3 p-3">
                  <avatar_1.Avatar className="h-10 w-10">
                    <avatar_1.AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || "User"}/>
                    <avatar_1.AvatarFallback>
                      {((_d = user.firstName) === null || _d === void 0 ? void 0 : _d[0]) || ((_f = (_e = user.email) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.toUpperCase()) || "U"}
                    </avatar_1.AvatarFallback>
                  </avatar_1.Avatar>
                  <div className="flex flex-col space-y-0.5 overflow-hidden">
                    <p className="text-sm font-medium truncate">
                      {user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.firstName || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email || "No email"}
                    </p>
                  </div>
                </div>
                <dropdown_menu_1.DropdownMenuSeparator />
                <dropdown_menu_1.DropdownMenuItem asChild>
                  <a href="/api/logout" className="flex items-center gap-2 cursor-pointer" data-testid="button-logout">
                    <lucide_react_1.LogOut className="w-4 h-4"/>
                    Sign Out
                  </a>
                </dropdown_menu_1.DropdownMenuItem>
              </dropdown_menu_1.DropdownMenuContent>
            </dropdown_menu_1.DropdownMenu>)}
        </div>
      </div>
    </header>);
}
