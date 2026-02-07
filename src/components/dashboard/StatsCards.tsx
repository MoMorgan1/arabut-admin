import { Card, CardContent } from "@/components/ui/card";
import { formatSAR } from "@/lib/utils/formatters";
import { ClipboardList, Wallet, CheckCircle2, Clock } from "lucide-react";

interface StatsCardsProps {
  ordersCount: number;
  revenue: number;
  ordersCompleted: number;
  ordersPending: number;
}

export default function StatsCards({
  ordersCount,
  revenue,
  ordersCompleted,
  ordersPending,
}: StatsCardsProps) {
  const cards = [
    {
      label: "Total Orders",
      value: ordersCount.toString(),
      icon: ClipboardList,
      color: "",
    },
    {
      label: "Settled Revenue (Month)",
      value: formatSAR(revenue),
      icon: Wallet,
      color: "",
    },
    {
      label: "Completed",
      value: ordersCompleted.toString(),
      icon: CheckCircle2,
      color: "text-green-500",
    },
    {
      label: "In Progress",
      value: ordersPending.toString(),
      icon: Clock,
      color: "text-yellow-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </p>
                <Icon className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <p className={`text-2xl font-bold mt-2 ${card.color}`}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
