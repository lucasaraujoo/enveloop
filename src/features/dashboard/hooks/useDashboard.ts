"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { dashboardService } from "@/services/dashboard.service";
import { monthPlanService } from "@/services/monthPlan.service";
import { toast } from "sonner";

function getDefaultMonthWindow() {
  const now = new Date();
  const current = { month: now.getMonth() + 1, year: now.getFullYear() };
  return current;
}

function addMonths(base: { month: number; year: number }, delta: number) {
  let m = base.month + delta;
  let y = base.year;
  while (m > 12) { m -= 12; y++; }
  while (m < 1)  { m += 12; y--; }
  return { month: m, year: y };
}

function buildMonthWindow(
  center: { month: number; year: number },
  count: number
) {
  const start = addMonths(center, -1);
  return Array.from({ length: count }, (_, i) => addMonths(start, i));
}

export function useDashboard(visibleCount: number = 4) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [center, setCenter] = useState(getDefaultMonthWindow);

  const monthsToShow = useMemo(
    () => buildMonthWindow(center, visibleCount),
    [center, visibleCount]
  );

  const dashboardQueryKey = ["dashboard", user?.uid, monthsToShow.map((m) => `${m.year}-${m.month}`)];

  const query = useQuery({
    queryKey: dashboardQueryKey,
    queryFn: () => dashboardService.getDashboardData(user!.uid, monthsToShow),
    enabled: !!user,
    staleTime: 30_000,
  });

  const updateLimitMutation = useMutation({
    mutationFn: async ({ month, year, envelopeId, limit }: { month: number, year: number, envelopeId: string, limit: number }) => {
      if (!user) throw new Error("User not authenticated");
      await monthPlanService.updateEnvelopeLimit(user.uid, month, year, envelopeId, limit);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      toast.success("Limite atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar o limite do envelope.");
    }
  });

  function navigatePrev() {
    setCenter((c) => addMonths(c, -1));
  }

  function navigateNext() {
    setCenter((c) => addMonths(c, 1));
  }

  function goToToday() {
    setCenter(getDefaultMonthWindow());
  }

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    updateLimitMutation,
    monthsToShow,
    center,
    navigatePrev,
    navigateNext,
    goToToday,
  };
}
