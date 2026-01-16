import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { ar } from "date-fns/locale"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  locale,
  ...props
}: CalendarProps) {
  const effectiveLocale = locale ?? ar
  const isArabic = effectiveLocale === ar || props.dir === "rtl"
  
  return (
    <div dir={isArabic ? "rtl" : "ltr"} lang={isArabic ? "ar" : "en"}>
      <DayPicker
        showOutsideDays={showOutsideDays}
        locale={effectiveLocale}
        weekStartsOn={6}
        className={cn("p-3", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center mb-1",
          caption_label: "hidden",
          caption_dropdowns: "flex justify-center items-center gap-1",
          nav: "flex items-center gap-1",
          nav_button: cn(
            buttonVariants({ variant: "ghost" }),
            "h-7 w-7 bg-transparent p-0 text-teal-700 hover:bg-teal-50 opacity-100"
          ),
          nav_button_previous: isArabic ? "absolute right-1" : "absolute left-1",
          nav_button_next: isArabic ? "absolute left-1" : "absolute right-1",
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
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground",
          day_outside:
            "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          Dropdown: ({ value, onChange, children, ...props }: any) => {
            const options = React.Children.toArray(children) as React.ReactElement<any>[];
            const selected = options.find((child) => child.props.value === value);
            const handleChange = (value: string) => {
              const changeEvent = {
                target: { value },
              } as React.ChangeEvent<HTMLSelectElement>;
              onChange?.(changeEvent);
            };
            return (
              <Select
                value={value?.toString()}
                onValueChange={(value) => handleChange(value)}
              >
                <SelectTrigger className="h-7 pr-2 pl-2 border-none bg-transparent hover:bg-accent hover:text-accent-foreground focus:ring-0">
                  <SelectValue>{selected?.props?.children}</SelectValue>
                </SelectTrigger>
                <SelectContent position="popper">
                  <ScrollArea className="h-80">
                    {options.map((option, id: number) => (
                      <SelectItem
                        key={`${option.props.value}-${id}`}
                        value={option.props.value?.toString() ?? ""}
                      >
                        {option.props.children}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            );
          },
          IconLeft: ({ className, ...iconProps }) => (
            isArabic ? (
              <ChevronRight className={cn("h-4 w-4", className)} {...iconProps} />
            ) : (
              <ChevronLeft className={cn("h-4 w-4", className)} {...iconProps} />
            )
          ),
          IconRight: ({ className, ...iconProps }) => (
            isArabic ? (
              <ChevronLeft className={cn("h-4 w-4", className)} {...iconProps} />
            ) : (
              <ChevronRight className={cn("h-4 w-4", className)} {...iconProps} />
            )
          ),
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
