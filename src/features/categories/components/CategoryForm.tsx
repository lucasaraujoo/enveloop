"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { Category } from "@/types/category.types";
import { toast } from "sonner";
import { useState } from "react";

const categorySchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  color: z.string().optional(),
});

type CategoryFormProps = {
  initialData?: Category;
  inactiveCategories?: Category[];
  onSuccess: () => void;
};

export function CategoryForm({ initialData, inactiveCategories = [], onSuccess }: CategoryFormProps) {
  const { createMutation, updateMutation, restoreMutation } = useCategories();
  const [duplicateCategory, setDuplicateCategory] = useState<Category | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof categorySchema> | null>(null);

  const form = useForm<z.infer<typeof categorySchema>>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name || "",
      color: initialData?.color || "#10b981",
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending || restoreMutation.isPending;

  async function onSubmit(values: z.infer<typeof categorySchema>) {
    if (initialData?.id) {
      try {
        await updateMutation.mutateAsync({
          id: initialData.id,
          ...values,
        });
        toast.success("Categoria atualizada com sucesso");
        onSuccess();
      } catch (error) {
        toast.error("Ocorreu um erro ao salvar a categoria");
      }
      return;
    }

    // Creating - check for duplicates in inactive categories
    const duplicate = inactiveCategories.find(
      (c) => c.name.toLowerCase().trim() === values.name.toLowerCase().trim()
    );

    if (duplicate) {
      setDuplicateCategory(duplicate);
      setPendingValues(values);
      return; // Wait for user confirmation
    }

    // Normal creation
    try {
      await createMutation.mutateAsync({
        ...values,
        active: true,
      });
      toast.success("Categoria criada com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar a categoria");
    }
  }

  const handleRestoreConfirm = async () => {
    if (!duplicateCategory || !pendingValues) return;
    
    try {
      await updateMutation.mutateAsync({
        id: duplicateCategory.id!,
        ...pendingValues,
      });
      await restoreMutation.mutateAsync(duplicateCategory.id!);
      
      toast.success("Categoria restaurada e atualizada com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao restaurar a categoria");
    } finally {
      setDuplicateCategory(null);
      setPendingValues(null);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Categoria</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Alimentação" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cor</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input type="color" className="w-16 p-1 h-10 cursor-pointer" {...field} />
                    <Input type="text" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={!!duplicateCategory} onOpenChange={(open) => !open && setDuplicateCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Categoria Inativa Encontrada</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe uma categoria inativa com o nome "{duplicateCategory?.name}". 
              Deseja restaurá-la e atualizar suas informações com os dados que você acabou de preencher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateCategory(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
