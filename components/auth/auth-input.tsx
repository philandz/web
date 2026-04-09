import * as React from "react";

import { FormInput } from "@/components/form/form-input";

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

const AuthInput = React.forwardRef<HTMLInputElement, AuthInputProps>(({ id, label, hint, error, className, ...props }, ref) => {
  return <FormInput ref={ref} id={id} label={label} hint={hint} error={error} className={className} {...props} />;
});

AuthInput.displayName = "AuthInput";

export { AuthInput };
