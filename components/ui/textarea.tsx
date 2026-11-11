import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-20 w-full rounded-md border border-control bg-raised px-3 py-2 text-base ring-offset-background placeholder:text-fg-3 focus-visible:outline-none focus-visible:border-fg focus-visible:ring-1 focus-visible:ring-fg disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea }
