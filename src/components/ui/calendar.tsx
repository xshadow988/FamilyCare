"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, getDefaultClassNames } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames()
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: cn(d.months, "flex flex-col sm:flex-row gap-4"),
        month: cn(d.month, "flex flex-col gap-4"),
        month_caption: cn(d.month_caption, "flex justify-center pt-1 relative items-center h-9"),
        caption_label: cn(d.caption_label, "text-sm font-medium"),
        nav: cn(d.nav, "flex items-center gap-1 absolute inset-x-0 top-0 justify-between px-1"),
        button_previous: cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-60 hover:opacity-100"),
        button_next: cn(buttonVariants({ variant: "outline" }), "size-7 bg-transparent p-0 opacity-60 hover:opacity-100"),
        month_grid: cn(d.month_grid, "w-full border-collapse space-y-1"),
        weekdays: cn(d.weekdays, "flex"),
        weekday: cn(d.weekday, "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"),
        week: cn(d.week, "flex w-full mt-2"),
        day: cn(
          d.day,
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent [&:has([aria-selected].range-end)]:rounded-r-md [&:has([aria-selected].range-start)]:rounded-l-md [&:has([aria-selected].outside)]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day_button: cn(buttonVariants({ variant: "ghost" }), "size-9 p-0 font-normal aria-selected:opacity-100"),
        range_start: cn(d.range_start, "range-start rounded-l-md"),
        range_end: cn(d.range_end, "range-end rounded-r-md"),
        range_middle: cn(d.range_middle, "aria-selected:bg-accent aria-selected:text-accent-foreground rounded-none"),
        selected: cn(d.selected, "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md"),
        today: cn(d.today, "bg-accent text-accent-foreground rounded-md"),
        outside: cn(d.outside, "outside text-muted-foreground aria-selected:text-muted-foreground"),
        disabled: cn(d.disabled, "text-muted-foreground opacity-40"),
        hidden: cn(d.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left"
            ? <ChevronLeft className="size-4" />
            : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  )
}

export { Calendar }
