"use client";

type SegmentedControlProps = {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
}: SegmentedControlProps) {
  return (
    <div
      className={`rounded-full bg-muted p-1 flex gap-1 transition-all ${className}`}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`
              flex-1 px-3 py-1.5 text-sm font-medium rounded-full
              transition-all duration-200 ease-out
              ${
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }
            `}
            style={{
              transition: "all 200ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
