import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Native select styled to match shadcn defaults (no Radix dependency).
 */
export function NativeSelect({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-9 w-full items-center rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm",
        "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function NativeSelectTrigger({ className, ...props }) {
  return <NativeSelect className={cn("max-w-xs", className)} {...props} />;
}
