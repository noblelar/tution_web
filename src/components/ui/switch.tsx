"use client";

import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps } from "react";

export function Switch({ className = "", ...props }: ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={`peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-slate-300 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-orange-100 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-orange-600 ${className}`}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
}
