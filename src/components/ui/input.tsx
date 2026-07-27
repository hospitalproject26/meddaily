import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9.5 w-full rounded-[10px] border border-input bg-card/60 px-3 py-1 text-base shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-[box-shadow,border-color,background-color] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground hover:border-ring/40 focus-visible:outline-none focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/12 focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
