import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <h1 className="text-6xl font-bold text-muted-foreground">404</h1>
      <div className="space-y-2">
        <h2 className="text-xl font-bold">الصفحة غير موجودة</h2>
        <p className="text-muted-foreground max-w-md">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>
      </div>
      <Button asChild>
        <Link href="/">العودة للرئيسية</Link>
      </Button>
    </div>
  );
}
