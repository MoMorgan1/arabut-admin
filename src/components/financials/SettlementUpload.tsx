"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettlementUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("اختر ملف Excel أولاً");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.set("file", file);

    try {
      const res = await fetch("/api/settlements/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "فشل رفع الملف");
        setLoading(false);
        return;
      }

      toast.success(
        `تم الرفع: ${data.matchedCount} مطابق، ${data.unmatchedCount} غير مطابق`
      );
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      toast.error("حدث خطأ أثناء الرفع");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>ملف تسوية سلة (Excel)</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-2">
              عمودان: رقم الطلب (order_id) والمبلغ بعد الضريبة (amount)
            </p>
            <div className="flex items-center gap-2">
              <Input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="max-w-xs"
              />
              {file && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </span>
              )}
            </div>
          </div>
          <Button type="submit" disabled={loading || !file} className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            رفع ومعايرة
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
