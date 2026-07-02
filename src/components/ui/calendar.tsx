"use client"

import "react-day-picker/style.css"
import * as React from "react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"

// Theme react-day-picker via its own CSS variables (its stylesheet handles the
// grid alignment; we only remap colors/sizes to the app theme).
const rdpTheme = {
  "--rdp-accent-color": "var(--primary)",
  "--rdp-accent-background-color": "var(--accent)",
  "--rdp-today-color": "var(--primary)",
  "--rdp-day-width": "2.4rem",
  "--rdp-day-height": "2.4rem",
  "--rdp-day_button-width": "2.1rem",
  "--rdp-day_button-height": "2.1rem",
  "--rdp-day_button-border-radius": "0.5rem",
  "--rdp-nav_button-width": "1.9rem",
  "--rdp-nav_button-height": "1.9rem",
  "--rdp-nav-height": "2.4rem",
  "--rdp-months-gap": "1.5rem",
  "--rdp-range_start-color": "var(--primary-foreground)",
  "--rdp-range_end-color": "var(--primary-foreground)",
  "--rdp-range_start-date-background-color": "var(--primary)",
  "--rdp-range_end-date-background-color": "var(--primary)",
  "--rdp-range_middle-background-color": "var(--accent)",
  "--rdp-range_middle-color": "var(--accent-foreground)",
} as React.CSSProperties

function Calendar({
  className,
  showOutsideDays = true,
  style,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 text-popover-foreground", className)}
      style={{ ...rdpTheme, ...style }}
      {...props}
    />
  )
}

export { Calendar }
