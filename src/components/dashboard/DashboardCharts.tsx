"use client";

import { lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic imports for chart components
const RevenueChart = lazy(() => import("@/components/dashboard/RevenueChart"));
const OrderTypesPie = lazy(() => import("@/components/dashboard/OrderTypesPie"));

interface DashboardChartsProps {
  revenueData: { date: string; label: string; revenue: number }[];
  orderTypesData: { name: string; value: number }[];
}

function ChartSkeleton() {
  return <Skeleton className="h-[250px] w-full" />;
}

export default function DashboardCharts({ revenueData, orderTypesData }: DashboardChartsProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Settled Revenue — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartSkeleton />}>
            <RevenueChart data={revenueData} />
          </Suspense>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Orders by Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ChartSkeleton />}>
            <OrderTypesPie data={orderTypesData} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
