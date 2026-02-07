"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { addExpenseAction } from "@/app/(dashboard)/financials/actions";

const CATEGORIES = [
  { value: "general", label: "عام" },
  { value: "marketing", label: "إعلانات" },
  { value: "operations", label: "تشغيل" },
  { value: "salaries", label: "رواتب" },
  { value: "software", label: "برمجيات" },
  { value: "other", label: "أخرى" },
];

export default function ExpenseForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState("1");
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!description.trim() || Number.isNaN(amountNum) || amountNum <= 0) {
      toast.error("يرجى إدخال الوصف والمبلغ صحيحاً");
      return;
    }

    const months = parseInt(recurringMonths, 10) || 1;
    const monthlyShare = isRecurring ? amountNum / months : null;

    setLoading(true);
    const result = await addExpenseAction({
      description: description.trim(),
      amount: amountNum,
      category,
      is_recurring: isRecurring,
      recurring_months: months,
      monthly_share: monthlyShare,
      expense_date: expenseDate,
    });
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("تمت إضافة المصروف");
    setOpen(false);
    setDescription("");
    setAmount("");
    setCategory("general");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة مصروف
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مصروف جديد</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="desc">الوصف</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف المصروف"
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">المبلغ (ر.س)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <Label htmlFor="category">التصنيف</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="date">التاريخ</Label>
            <Input
              id="date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              dir="ltr"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="recurring">مصروف شهري متكرر</Label>
          </div>
          {isRecurring && (
            <div>
              <Label htmlFor="months">عدد الأشهر للتوزيع</Label>
              <Input
                id="months"
                type="number"
                min="1"
                value={recurringMonths}
                onChange={(e) => setRecurringMonths(e.target.value)}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
