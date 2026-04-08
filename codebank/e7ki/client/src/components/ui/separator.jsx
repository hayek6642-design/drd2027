"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Separator = void 0;
const React = require("react");
const SeparatorPrimitive = require("@radix-ui/react-separator");
const utils_1 = require("@/lib/utils");
const Separator = React.forwardRef((_a, ref) => {
    var { className, orientation = "horizontal", decorative = true } = _a, props = __rest(_a, ["className", "orientation", "decorative"]);
    return (<SeparatorPrimitive.Root ref={ref} decorative={decorative} orientation={orientation} className={(0, utils_1.cn)("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className)} {...props}/>);
});
exports.Separator = Separator;
Separator.displayName = SeparatorPrimitive.Root.displayName;
