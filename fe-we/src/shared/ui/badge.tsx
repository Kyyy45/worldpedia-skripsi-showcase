import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/shared/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border-transparent bg-primary text-primary-foreground",
        secondary:   "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive/10 text-destructive dark:bg-destructive/20 print:!bg-destructive/10",
        outline:     "text-foreground",
        success:     "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 print:!bg-green-100 print:!text-green-800",
        warning:     "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 print:!bg-yellow-100 print:!text-yellow-800",
        info:        "border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 print:!bg-blue-100 print:!text-blue-800",
        muted:       "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

interface BadgeProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
