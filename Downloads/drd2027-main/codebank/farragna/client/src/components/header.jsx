import { useState, useCallback } from "react";
import { Upload, Heart, Moon, Sun, Search, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onUploadClick: () => void;
  onFavoritesClick: () => void;
  onAdminClick: () => void;
  onSearch?: (query: string) => void;
}

export function Header({
  onUploadClick,
  onFavoritesClick,
  onAdminClick,
  onSearch,
}: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated } = useAuth();
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogoClick = useCallback(() => {
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

  const handleSearch = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  }, [searchQuery, onSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    onSearch?.("");
    setShowSearch(false);
  }, [onSearch]);

  return (
    <header className="fixed top-0 left-0 right-0 h-20 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="h-full px-5 flex items-center justify-between gap-4">
        <button
          onClick={handleLogoClick}
          className="relative group flex items-center gap-2"
          data-testid="button-logo"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent select-none">
            Farragna
          </h1>
          <div className="absolute -inset-2 rounded-lg bg-gradient-to-r from-primary/20 to-accent/20 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          {logoClickCount > 0 && logoClickCount < 7 && (
            <div className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full">
              <div
                className="h-full bg-accent rounded-full transition-all duration-200"
                style={{ width: `${(logoClickCount / 7) * 100}%` }}
              />
            </div>
          )}
        </button>

        <div className="flex-1 flex justify-center">
          {showSearch ? (
            <form onSubmit={handleSearch} className="w-full max-w-md flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8"
                  autoFocus
                  data-testid="input-search"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button type="submit" size="default" data-testid="button-search-submit">
                Search
              </Button>
            </form>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(true)}
              data-testid="button-search-toggle"
            >
              <Search className="w-5 h-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={onUploadClick}
            className="gap-2"
            data-testid="button-upload"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onFavoritesClick}
            className="relative"
            data-testid="button-favorites"
          >
            <Heart className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>

          {isAuthenticated && user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0" data-testid="button-user-menu">
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user.profileImageUrl || undefined}
                      alt={user.firstName ? `${user.firstName} avatar` : "User avatar"}
                    />
                    <AvatarFallback>
                      {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={user.profileImageUrl || undefined}
                      alt={user.firstName ? `${user.firstName} avatar` : "User avatar"}
                    />
                    <AvatarFallback>
                      {(user.firstName?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      const response = await fetch("/api/logout", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                        },
                      });
                      if (response.ok) {
                        window.location.reload();
                      } else {
                        throw new Error(`Logout failed with status: ${response.status}`);
                      }
                    } catch (error) {
                      console.error("Logout failed:", error);
                      // Fallback: try to redirect to logout URL
                      window.location.href = "/api/logout";
                    }
                  }}
                  className="flex items-center gap-2 cursor-pointer"
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
