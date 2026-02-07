"use client";

import { STATUS_LABELS } from "@/lib/utils/constants";
import { formatDateTime } from "@/lib/utils/formatters";
import type { OrderStatusLog } from "@/types/database";

interface StatusTimelineProps {
  entries: OrderStatusLog[];
  className?: string;
}

export default function StatusTimeline({ entries, className }: StatusTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">لا يوجد سجل تغييرات</p>
    );
  }

  const sorted = [...entries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className={className}>
      <div className="relative pr-4 border-r-2 border-border">
        {sorted.map((entry) => {
          const newLabel = STATUS_LABELS[entry.new_status] ?? entry.new_status;
          const oldLabel = entry.old_status
            ? STATUS_LABELS[entry.old_status] ?? entry.old_status
            : null;

          return (
            <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
              <div className="absolute right-[-9px] top-2 h-3 w-3 rounded-full border-2 border-primary bg-background" />
              <div className="flex-1 pr-3">
                <p className="text-sm font-medium">
                  {oldLabel ? (
                    <>
                      <span className="text-muted-foreground">{oldLabel}</span>
                      <span className="mx-2">→</span>
                      <span>{newLabel}</span>
                    </>
                  ) : (
                    <span>{newLabel}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(entry.created_at)}
                </p>
                {entry.note && (
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    {entry.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
