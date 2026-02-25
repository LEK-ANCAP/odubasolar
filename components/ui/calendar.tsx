"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, useNavigation } from "react-day-picker"
import { es } from "date-fns/locale"
import { setMonth, setYear } from "date-fns"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium hidden",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
        row: "flex w-full mt-2",
        cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-sm scale-105 font-medium",
        day_today: "bg-accent/40 text-accent-foreground font-semibold border border-accent",
        day_outside:
          "day-outside text-muted-foreground/30 opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ ...props }) => <ChevronLeft className="h-4 w-4" {...props} />,
        Caption: CustomCaption,
      } as any}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

function CustomCaption(props: any) {
  const { goToMonth, nextMonth, previousMonth } = useNavigation()
  const { displayMonth } = props

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ]

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i)

  const handleMonthChange = (value: string) => {
    const newMonth = months.indexOf(value)
    const newDate = setMonth(displayMonth, newMonth)
    goToMonth(newDate)
  }

  const handleYearChange = (value: string) => {
    const newYear = parseInt(value)
    const newDate = setYear(displayMonth, newYear)
    goToMonth(newDate)
  }

  return (
    <div className="flex items-center justify-between pt-1 relative">
      <div className="flex items-center gap-1">
        <button
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1")}
          onClick={() => previousMonth && goToMonth(previousMonth)}
          disabled={!previousMonth}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2 items-center justify-center w-full">
        <Select
          value={months[displayMonth.getMonth()]}
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-7 w-[120px] gap-1 bg-transparent border-0 hover:bg-accent focus:bg-accent focus:ring-0 shadow-none font-medium text-sm p-2 flex justify-between">
            <SelectValue>{months[displayMonth.getMonth()]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-56">
              {months.map((month) => (
                <SelectItem key={month} value={month}>{month}</SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>

        <Select
          value={displayMonth.getFullYear().toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-7 w-[80px] gap-1 bg-transparent border-0 hover:bg-accent focus:bg-accent focus:ring-0 shadow-none font-medium text-sm p-2 flex justify-between">
            <SelectValue>{displayMonth.getFullYear()}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-80">
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <button
          className={cn(buttonVariants({ variant: "outline" }), "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1")}
          onClick={() => nextMonth && goToMonth(nextMonth)}
          disabled={!nextMonth}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export { Calendar }
