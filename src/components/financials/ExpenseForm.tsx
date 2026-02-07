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
  { value: "general", label: "General" },
  { value: "marketing", label: "Marketing" },
  { value: "operations", label: "Operations" },
  { value: "salaries", label: "Salaries" },
  { value: "software", label: "Software" },
  { value: "other", label: "Other" },
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
      toast.error("Please enter a valid description and amount");
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

    toast.success("Expense added successfully");
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
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="desc">Description</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Expense description"
              required
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount (SAR)</Label>
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
            <Label htmlFor="category">Category</Label>
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
            <Label htmlFor="date">Date</Label>
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
            <Label htmlFor="recurring">Recurring monthly expense</Label>
          </div>
          {isRecurring && (
            <div>
              <Label htmlFor="months">Number of months to distribute</Label>
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
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
