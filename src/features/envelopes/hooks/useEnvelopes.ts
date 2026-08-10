import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { envelopeService } from "@/services/envelope.service";
import { useAuth } from "@/providers/AuthProvider";
import { Envelope } from "@/types/envelope.types";

export function useEnvelopes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const envelopesQuery = useQuery({
    queryKey: ["envelopes", user?.uid],
    queryFn: () => envelopeService.getEnvelopes(user!.uid),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Envelope, "id" | "createdAt" | "updatedAt">) =>
      envelopeService.createEnvelope(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Envelope> & { id: string }) =>
      envelopeService.updateEnvelope(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => envelopeService.deleteEnvelope(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => envelopeService.restoreEnvelope(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["envelopes", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const activeEnvelopes = envelopesQuery.data?.filter((e) => e.active) || [];
  const inactiveEnvelopes = envelopesQuery.data?.filter((e) => !e.active) || [];

  return {
    envelopesQuery,
    activeEnvelopes,
    inactiveEnvelopes,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
  };
}
