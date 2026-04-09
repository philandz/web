import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { cn } from "@/lib/utils";

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, FormTextareaProps>(({ id, label, hint, error, className, ...props }, ref) => {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={props.required}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition",
          "placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/50",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-destructive focus:border-destructive focus:ring-destructive/35" : "",
          className
        )}
        {...props}
      />
    </FormField>
  );
});

FormTextarea.displayName = "FormTextarea";
