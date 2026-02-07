"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "@/app/(dashboard)/notifications/actions";
import { toast } from "sonner";
import { CheckCheck } from "lucide-react";

interface MarkAllReadButtonProps {
  hasUnread: boolean;
}

export default function MarkAllReadButton({ hasUnread }: MarkAllReadButtonProps) {
  const router = useRouter();

  if (!hasUnread) return null;

  async function handleClick() {
    const result = await markAllNotificationsReadAction();
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success("تم تحديد الكل كمقروء");
    router.refresh();
  }

  return (
    <Button variant="outline" size="sm" onClick={handleClick} className="gap-2">
      <CheckCheck className="h-4 w-4" />
      تحديد الكل كمقروء
    </Button>
  );
}
