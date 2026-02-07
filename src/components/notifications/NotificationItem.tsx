"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatRelativeTime } from "@/lib/utils/formatters";
import { markNotificationReadAction } from "@/app/(dashboard)/notifications/actions";
import type { Notification } from "@/types/database";

interface NotificationItemProps {
  notification: Notification;
}

export default function NotificationItem({ notification }: NotificationItemProps) {
  const router = useRouter();

  async function handleClick() {
    if (!notification.is_read) {
      await markNotificationReadAction(notification.id);
      router.refresh();
    }
  }

  return (
    <li
      className={`flex flex-wrap items-center justify-between gap-2 py-3 px-3 rounded-lg border border-border ${
        !notification.is_read ? "bg-muted/30" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium">{notification.title}</p>
        {notification.message && (
          <p className="text-sm text-muted-foreground truncate">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
      {notification.link ? (
        <Link
          href={notification.link}
          onClick={handleClick}
          className="text-sm text-primary hover:underline shrink-0"
        >
          View
        </Link>
      ) : null}
    </li>
  );
}
