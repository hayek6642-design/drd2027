"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtectionWatermark = ProtectionWatermark;
const lucide_react_1 = require("lucide-react");
function ProtectionWatermark() {
    return (<div className="fixed bottom-3 right-3 z-50 pointer-events-none select-none">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm">
        <lucide_react_1.Shield className="w-3 h-3 text-white/70"/>
        <span className="text-xs text-white/70 font-medium">Farragna</span>
        <span className="text-white/40 mx-1">|</span>
        <span className="text-xs text-white/50">Protected</span>
      </div>
    </div>);
}
