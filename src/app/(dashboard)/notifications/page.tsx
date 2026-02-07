import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import NotificationItem from "@/components/notifications/NotificationItem";
import MarkAllReadButton from "@/components/notifications/MarkAllReadButton";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-muted-foreground">
        يرجى تسجيل الدخول
      </div>
    );
  }

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .or(`user_id.eq.${user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(50);

  const hasUnread = notifications?.some((n) => !n.is_read) ?? false;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">الإشعارات</h1>
        </div>
        <MarkAllReadButton hasUnread={hasUnread} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>آخر الإشعارات</CardTitle>
        </CardHeader>
        <CardContent>
          {!notifications?.length ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              لا توجد إشعارات
            </p>
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
