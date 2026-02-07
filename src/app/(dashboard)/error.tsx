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
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          Sorry, we couldn&apos;t load this page. Please try again or go back to the dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          Try Again
        </Button>
        <Button variant="outline" asChild>
          <a href="/">Back to Dashboard</a>
        </Button>
      </div>
    </div>
  );
}
