"use client";

import { useState } from "react";
import TargetVsActualCard from "@/components/kpi/TargetVsActualCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KPIFormDialog } from "@/components/kpi/KPIFormDialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  DollarSign,
  CheckSquare,
  Target,
  User,
  FileText,
  Gauge,
} from "lucide-react";

export default function KpiOverview() {
  const { user } = useAuth();
  const [showKpiDialog, setShowKpiDialog] = useState(false);
  const isAdmin = user?.role === 'admin';

  // NOTE:
  // This page is intentionally simple and uses static/example values.
  // In real usage, pass live data from Firestore or your existing libs.
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-background border border-blue-500/20 p-6 sm:p-8">
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              KPI Overview
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Visual comparison of target vs actual performance. This is a reusable component you can
              drop into Dashboard, Tasks, Financials, or user pages.
            </p>
          </div>
          {isAdmin && (
            <Button 
              onClick={() => setShowKpiDialog(true)} 
              className="w-full sm:w-auto shadow-lg hover:shadow-xl transition-all duration-300 border-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 font-semibold"
              size="lg"
            >
              Create KPI
            </Button>
          )}
        </div>
      </div>

      <Card className="border-2 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 sm:pb-6 bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-muted/30 border-b-2">
          <CardTitle className="text-lg sm:text-xl font-semibold">
            Examples
          </CardTitle>
          <CardDescription className="text-sm">
            These use placeholder numbers to demonstrate the component in different KPI contexts.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <TargetVsActualCard
            title="Monthly Revenue"
            target={50000}
            actual={42000}
            unit="$"
            icon={DollarSign}
          />
          <TargetVsActualCard
            title="Tasks Completed (Team)"
            target={120}
            actual={82}
            unit="tasks"
            icon={CheckSquare}
          />
          <TargetVsActualCard
            title="Average Task KPI"
            target={100}
            actual={96}
            unit="%"
            icon={Target}
          />
          <TargetVsActualCard
            title="Individual User – Monthly Tasks"
            target={40}
            actual={28}
            unit="tasks"
            icon={User}
          />
          <TargetVsActualCard
            title="IT Tickets Closed"
            target={60}
            actual={35}
            unit="tickets"
            icon={FileText}
          />
          <TargetVsActualCard
            title="Operations Efficiency"
            target={95}
            actual={67}
            unit="%"
            icon={Gauge}
          />
        </CardContent>
      </Card>

      {/* KPI Form Dialog */}
      <KPIFormDialog
        open={showKpiDialog}
        onOpenChange={setShowKpiDialog}
        onSuccess={() => {
          setShowKpiDialog(false);
          // TODO: Refresh KPI data when Firestore integration is complete
        }}
      />
    </div>
  );
}

