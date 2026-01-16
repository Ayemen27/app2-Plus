import * as React from "react";
import { cn } from "@/lib/utils";

interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormGrid({ children, className, ...props }: FormGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-3 md:gap-4",
        className
      )}
      dir="rtl"
      {...props}
    >
      {children}
    </div>
  );
}

type FieldSize = "full" | "half" | "third" | "quarter" | "two-thirds";

interface FormFieldWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  size?: FieldSize;
}

const sizeClasses: Record<FieldSize, string> = {
  full: "col-span-12",
  half: "col-span-12 md:col-span-6",
  third: "col-span-12 md:col-span-4",
  quarter: "col-span-12 md:col-span-3",
  "two-thirds": "col-span-12 md:col-span-8",
};

export function FormFieldWrapper({
  children,
  size = "full",
  className,
  ...props
}: FormFieldWrapperProps) {
  return (
    <div
      className={cn(sizeClasses[size], "space-y-2", className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface FormRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function FormRow({ children, className, ...props }: FormRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-12 gap-3 md:gap-4",
        className
      )}
      dir="rtl"
      {...props}
    >
      {children}
    </div>
  );
}

interface CompactFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
}

export function CompactFieldGroup({
  children,
  columns = 2,
  className,
  ...props
}: CompactFieldGroupProps) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-4",
  };

  return (
    <div
      className={cn(
        "grid gap-3 md:gap-4",
        gridCols[columns],
        className
      )}
      dir="rtl"
      {...props}
    >
      {children}
    </div>
  );
}
