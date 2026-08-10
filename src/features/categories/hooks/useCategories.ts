import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "@/services/category.service";
import { useAuth } from "@/providers/AuthProvider";
import { Category } from "@/types/category.types";

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["categories", user?.uid],
    queryFn: () => categoryService.getCategories(user!.uid),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Category, "id" | "createdAt" | "updatedAt">) =>
      categoryService.createCategory(user!.uid, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Category> & { id: string }) =>
      categoryService.updateCategory(user!.uid, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => categoryService.deleteCategory(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => categoryService.restoreCategory(user!.uid, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories", user?.uid] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", user?.uid] });
    },
  });

  const activeCategories = categoriesQuery.data?.filter((c) => c.active) || [];
  const inactiveCategories = categoriesQuery.data?.filter((c) => !c.active) || [];

  return {
    categoriesQuery,
    activeCategories,
    inactiveCategories,
    createMutation,
    updateMutation,
    deleteMutation,
    restoreMutation,
  };
}
