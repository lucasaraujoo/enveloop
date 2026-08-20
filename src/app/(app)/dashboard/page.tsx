"use client";

import { useEffect } from "react";
import { useDashboard } from "@/features/dashboard/hooks/useDashboard";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { GlobalIndicators } from "@/features/dashboard/components/GlobalIndicators";
import { MonthGrid } from "@/features/dashboard/components/MonthGrid";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWindowSize } from "@/hooks/useWindowSize";

export default function DashboardPage() {
  const { width } = useWindowSize();
  // Mobile: 4 columns, tablet: 6, desktop: up to 12
  const visibleCount = width < 640 ? 4 : width < 1024 ? 6 : 12;

  const {
    data,
    isLoading,
    isError,
    refetch,
    navigatePrev,
    navigateNext,
    goToToday,
    updateLimitMutation,
  } = useDashboard(visibleCount);

  const { totalInGoals, goalsQuery } = useGoals();

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do seu planejamento financeiro
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="flex h-64 items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Carregando planejamento...</p>
          </div>
        </div>
      )}

      {isError && (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <p className="text-sm text-muted-foreground">
            Erro ao carregar dados. Tente novamente.
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Tentar novamente
          </Button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* Global indicators */}
          <GlobalIndicators
            totalBalance={data.totalBalance}
            totalPendingBills={data.totalPendingBills}
            totalInGoals={totalInGoals}
            isGoalsLoading={goalsQuery.isLoading}
          />

          {/* Planning grid */}
          <MonthGrid
            data={data}
            isMobile={width < 768}
            onNavigatePrev={navigatePrev}
            onNavigateNext={navigateNext}
            onGoToToday={goToToday}
            onUpdateLimit={(month, year, envelopeId, limit) => updateLimitMutation.mutateAsync({ month, year, envelopeId, limit })}
          />
        </>
      )}
    </div>
  );
}
