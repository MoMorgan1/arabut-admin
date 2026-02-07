"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center px-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">An unexpected error occurred</h2>
        <p className="text-muted-foreground max-w-md">
          Sorry, something went wrong while loading the page. Please try again.
        </p>
      </div>
      <Button onClick={reset} variant="default">
        Try Again
      </Button>
    </div>
  );
}
