import * as React from "react";

import { FormField } from "@/components/form/form-field";
import { cn } from "@/lib/utils";

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(({ id, label, hint, error, className, ...props }, ref) => {
  return (
    <FormField id={id} label={label} hint={hint} error={error} required={props.required}>
      <input
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        className={cn(
          "h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition",
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

FormInput.displayName = "FormInput";
