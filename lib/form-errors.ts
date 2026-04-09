import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { getValidationErrors, isApiError } from "@/lib/http/errors";

export function applyServerValidationErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  error: unknown,
  keyMap?: Partial<Record<string, Path<TFieldValues>>>
) {
  const fieldErrors = getValidationErrors(error);
  if (!fieldErrors) return false;

  Object.entries(fieldErrors).forEach(([serverKey, messages]) => {
    const mappedKey = keyMap?.[serverKey] ?? (serverKey as Path<TFieldValues>);
    const message = messages[0];
    if (!message) return;
    setError(mappedKey, {
      type: "server",
      message
    });
  });

  return true;
}

export function getFormErrorMessage(error: unknown, fallback: string) {
  if (isApiError(error)) {
    return error.message || fallback;
  }

  return fallback;
}
