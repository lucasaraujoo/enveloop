import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cardService } from "@/services/card.service";
import { useAuth } from "@/providers/AuthProvider";
import { Card } from "@/types/card.types";

export function useCards() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const cardsQuery = useQuery({
    queryKey: ["cards", user?.uid],
    queryFn: () => cardService.getCards(user!.uid),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Card, "id" | "createdAt" | "updatedAt">) =>
      cardService.createCard(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Card> & { id: string }) =>
      cardService.updateCard(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cardService.deleteCard(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => cardService.restoreCard(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cards", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const activeCards = cardsQuery.data?.filter((c) => c.active) || [];
  const inactiveCards = cardsQuery.data?.filter((c) => !c.active) || [];

  return {
    cardsQuery,
    activeCards,
    inactiveCards,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
  };
}
