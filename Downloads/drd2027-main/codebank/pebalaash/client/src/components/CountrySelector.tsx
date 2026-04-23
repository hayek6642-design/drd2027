import { useState } from "react";
import { Globe, X } from "lucide-react";
import { COUNTRIES } from "@shared/routes";

interface Props { onSelect: (code: string) => void; }

export function CountrySelector({ onSelect }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-blue-500/30 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-6 border-b border-border/40 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Globe className="w-6 h-6 text-blue-400 animate-pulse"/>
            <h2 className="text-2xl font-display font-black gradient-text">Welcome to Pebalaash!</h2>
          </div>
          <p className="text-muted-foreground text-sm">Select your country to see products available near you</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {COUNTRIES.map(c => (
              <button key={c.code} onMouseEnter={() => setHovered(c.code)} onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(c.code)}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 text-left group ${
                  hovered === c.code
                    ? "border-blue-500 bg-blue-500/20 scale-105 shadow-lg shadow-blue-500/10"
                    : "border-border/50 bg-card/60 hover:border-blue-500/40"
                }`}>
                <span className="text-2xl leading-none">{c.flag}</span>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-foreground truncate group-hover:text-blue-300 transition-colors">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{c.code}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border/40 text-center">
            <button onClick={() => onSelect("ALL")}
              className="text-sm text-muted-foreground hover:text-blue-400 font-medium transition-colors flex items-center gap-1 mx-auto">
              <Globe className="w-4 h-4"/> Browse all countries
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
