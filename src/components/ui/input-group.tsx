"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn(
        "group/input-group relative flex w-full items-center rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] outline-none focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50 [&>input]:flex-1 [&>input]:bg-transparent [&>input]:px-3 [&>input]:py-1.5 [&>input]:outline-none",
        className
      )}
      {...props}
    />
  )
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end"
}) {
  return (
    <div
      data-slot="input-group-addon"
      data-align={align}
      className={cn(
        "order-first flex items-center gap-1.5 pl-3 text-muted-foreground select-none [&>svg]:shrink-0",
        align === "inline-end" && "order-last pr-3 pl-0",
        className
      )}
      {...props}
    />
  )
}

export { InputGroup, InputGroupAddon }
