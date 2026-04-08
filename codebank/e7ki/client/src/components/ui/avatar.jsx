import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

const Avatar = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <AvatarPrimitive.Root
            ref={ref}
            className={cn(
                "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full after:content-[''] after:block after:absolute after:inset-0 after:rounded-full after:pointer-events-none after:border after:border-black/10 dark:after:border-white/10",
                className
            )}
            {...props}
        />
    );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <AvatarPrimitive.Image
            ref={ref}
            className={cn("aspect-square h-full w-full", className)}
            {...props}
        />
    );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <AvatarPrimitive.Fallback
            ref={ref}
            className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
            {...props}
        />
    );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
