import { STATUS_STYLES } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    color: "bg-muted",
    textColor: "text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        style.color,
        style.textColor,
        className
      )}
    >
      {style.label}
    </span>
  );
}
