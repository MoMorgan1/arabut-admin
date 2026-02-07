"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileJson, FileSpreadsheet, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { parseCSV, csvRowsToMigrationOrders } from "@/lib/utils/csv-parser";

export default function DataMigrationUpload() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileType = file?.name.endsWith(".csv")
    ? "csv"
    : file?.name.endsWith(".json")
      ? "json"
      : null;

  async function handleSubmit() {
    if (!file) {
      toast.error("Select a JSON or CSV file");
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      let json: { orders: unknown[] };

      if (file.name.endsWith(".csv")) {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          toast.error("File is empty or contains no valid rows");
          setLoading(false);
          return;
        }
        json = csvRowsToMigrationOrders(rows);
        toast.info(`Converted ${rows.length} CSV rows to ${json.orders.length} orders`);
      } else {
        json = JSON.parse(text);
      }

      const res = await fetch("/api/migration/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Migration failed");
        setLoading(false);
        return;
      }

      toast.success(
        `Done: ${data.insertedOrders} orders, ${data.insertedItems} items`
      );
      if (data.errors?.length) {
        toast.warning(`${data.errors.length} warnings/errors`);
        console.warn("Migration warnings:", data.errors);
      }
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    } catch {
      toast.error("Invalid file or network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label>Data File (JSON or CSV)</Label>
          <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-sm space-y-2">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">How to export from Google Sheets:</p>
                <ol className="list-decimal ml-4 mt-1 space-y-1 text-muted-foreground">
                  <li>Open your spreadsheet in Google Sheets</li>
                  <li>Click <strong>File</strong> → <strong>Download</strong> → <strong>Comma-separated values (.csv)</strong></li>
                  <li>Upload the CSV file here</li>
                </ol>
              </div>
            </div>
            <div className="text-muted-foreground">
              <p className="font-medium text-foreground">Supported columns:</p>
              <p className="font-mono text-xs mt-1">
                salla_order_id | customer_name | customer_phone | salla_total_sar | status | order_date | item_type | product_name | platform | coins_amount_k
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept=".json,.csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="max-w-xs"
          />
          {file && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              {fileType === "csv" ? (
                <FileSpreadsheet className="h-4 w-4" />
              ) : (
                <FileJson className="h-4 w-4" />
              )}
              {file.name}
            </span>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={loading || !file} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Migrate Data
        </Button>
      </CardContent>
    </Card>
  );
}
