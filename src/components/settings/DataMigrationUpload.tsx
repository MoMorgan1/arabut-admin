"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileJson, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function DataMigrationUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit() {
    if (!file) {
      toast.error("اختر ملف JSON");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/migration/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "فشل الترحيل");
        setLoading(false);
        return;
      }

      toast.success(
        `تم: ${data.insertedOrders} طلب، ${data.insertedItems} عنصر`
      );
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} تحذير/خطأ`);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch (err) {
      toast.error("ملف غير صالح أو خطأ في الشبكة");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label>ملف JSON للترحيل</Label>
          <p className="text-xs text-muted-foreground mt-1 mb-2">
            الصيغة: <code className="bg-muted px-1 rounded">{"{ \"orders\": [ { \"salla_order_id\", \"customer_name\", \"order_date\", \"items\": [ { \"item_type\", \"product_name\", \"status\" } ] }, ... ] }"}</code>
          </p>
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="file"
              accept=".json"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="max-w-xs"
            />
            {file && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileJson className="h-4 w-4" />
                {file.name}
              </span>
            )}
          </div>
        </div>
        <Button type="submit" onClick={handleSubmit} disabled={loading || !file} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          ترحيل البيانات
        </Button>
      </CardContent>
    </Card>
  );
}
