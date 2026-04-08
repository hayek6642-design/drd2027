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
exports.AlertDescription = exports.AlertTitle = exports.Alert = void 0;
const React = require("react");
const class_variance_authority_1 = require("class-variance-authority");
const utils_1 = require("@/lib/utils");
const alertVariants = (0, class_variance_authority_1.cva)("relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground", {
    variants: {
        variant: {
            default: "bg-background text-foreground",
            destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        },
    },
    defaultVariants: {
        variant: "default",
    },
});
const Alert = React.forwardRef((_a, ref) => {
    var { className, variant } = _a, props = __rest(_a, ["className", "variant"]);
    return (<div ref={ref} role="alert" className={(0, utils_1.cn)(alertVariants({ variant }), className)} {...props}/>);
});
exports.Alert = Alert;
Alert.displayName = "Alert";
const AlertTitle = React.forwardRef((_a, ref) => {
    var { className } = _a, props = __rest(_a, ["className"]);
    return (<h5 ref={ref} className={(0, utils_1.cn)("mb-1 font-medium leading-none tracking-tight", className)} {...props}/>);
});
exports.AlertTitle = AlertTitle;
AlertTitle.displayName = "AlertTitle";
const AlertDescription = React.forwardRef((_a, ref) => {
    var { className } = _a, props = __rest(_a, ["className"]);
    return (<div ref={ref} className={(0, utils_1.cn)("text-sm [&_p]:leading-relaxed", className)} {...props}/>);
});
exports.AlertDescription = AlertDescription;
AlertDescription.displayName = "AlertDescription";
