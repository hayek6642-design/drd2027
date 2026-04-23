"use client";
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
exports.FormField = exports.FormMessage = exports.FormDescription = exports.FormControl = exports.FormLabel = exports.FormItem = exports.Form = exports.useFormField = void 0;
const React = require("react");
const react_slot_1 = require("@radix-ui/react-slot");
const react_hook_form_1 = require("react-hook-form");
const utils_1 = require("@/lib/utils");
const label_1 = require("@/components/ui/label");
const Form = react_hook_form_1.FormProvider;
exports.Form = Form;
const FormFieldContext = React.createContext({});
const FormField = (_a) => {
    var props = __rest(_a, []);
    return (<FormFieldContext.Provider value={{ name: props.name }}>
      <react_hook_form_1.Controller {...props}/>
    </FormFieldContext.Provider>);
};
exports.FormField = FormField;
const useFormField = () => {
    const fieldContext = React.useContext(FormFieldContext);
    const itemContext = React.useContext(FormItemContext);
    const { getFieldState, formState } = (0, react_hook_form_1.useFormContext)();
    const fieldState = getFieldState(fieldContext.name, formState);
    if (!fieldContext) {
        throw new Error("useFormField should be used within <FormField>");
    }
    const { id } = itemContext;
    return Object.assign({ id, name: fieldContext.name, formItemId: `${id}-form-item`, formDescriptionId: `${id}-form-item-description`, formMessageId: `${id}-form-item-message` }, fieldState);
};
exports.useFormField = useFormField;
const FormItemContext = React.createContext({});
const FormItem = React.forwardRef((_a, ref) => {
    var { className } = _a, props = __rest(_a, ["className"]);
    const id = React.useId();
    return (<FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={(0, utils_1.cn)("space-y-2", className)} {...props}/>
    </FormItemContext.Provider>);
});
exports.FormItem = FormItem;
FormItem.displayName = "FormItem";
const FormLabel = React.forwardRef((_a, ref) => {
    var { className } = _a, props = __rest(_a, ["className"]);
    const { error, formItemId } = useFormField();
    return (<label_1.Label ref={ref} className={(0, utils_1.cn)(error && "text-destructive", className)} htmlFor={formItemId} {...props}/>);
});
exports.FormLabel = FormLabel;
FormLabel.displayName = "FormLabel";
const FormControl = React.forwardRef((_a, ref) => {
    var props = __rest(_a, []);
    const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
    return (<react_slot_1.Slot ref={ref} id={formItemId} aria-describedby={!error
            ? `${formDescriptionId}`
            : `${formDescriptionId} ${formMessageId}`} aria-invalid={!!error} {...props}/>);
});
exports.FormControl = FormControl;
FormControl.displayName = "FormControl";
const FormDescription = React.forwardRef((_a, ref) => {
    var { className } = _a, props = __rest(_a, ["className"]);
    const { formDescriptionId } = useFormField();
    return (<p ref={ref} id={formDescriptionId} className={(0, utils_1.cn)("text-sm text-muted-foreground", className)} {...props}/>);
});
exports.FormDescription = FormDescription;
FormDescription.displayName = "FormDescription";
const FormMessage = React.forwardRef((_a, ref) => {
    var _b;
    var { className, children } = _a, props = __rest(_a, ["className", "children"]);
    const { error, formMessageId } = useFormField();
    const body = error ? String((_b = error === null || error === void 0 ? void 0 : error.message) !== null && _b !== void 0 ? _b : "") : children;
    if (!body) {
        return null;
    }
    return (<p ref={ref} id={formMessageId} className={(0, utils_1.cn)("text-sm font-medium text-destructive", className)} {...props}>
      {body}
    </p>);
});
exports.FormMessage = FormMessage;
FormMessage.displayName = "FormMessage";
