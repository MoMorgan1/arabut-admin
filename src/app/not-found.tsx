import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-muted-foreground max-w-md">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
      </div>
      <Button asChild>
        <Link href="/">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
