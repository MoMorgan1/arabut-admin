"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center px-4">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h2 className="text-xl font-bold">حدث خطأ</h2>
        <p className="text-muted-foreground max-w-md">
          عذراً، لم نتمكن من تحميل هذه الصفحة. يرجى المحاولة مرة أخرى أو العودة للرئيسية.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          إعادة المحاولة
        </Button>
        <Button variant="outline" asChild>
          <a href="/">العودة للرئيسية</a>
        </Button>
      </div>
    </div>
  );
}
