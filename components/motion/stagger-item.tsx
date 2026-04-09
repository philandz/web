import { cn } from "@/lib/utils";

export function StaggerItem({
  children,
  delay = 0,
  className
}: {
  children: import("react").ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn("animate-fade-in-up motion-reduce:animate-none [animation-fill-mode:both]", className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
