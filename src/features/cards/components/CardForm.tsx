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
  FormDescription,
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
import { useCards } from "@/features/cards/hooks/useCards";
import { Card } from "@/types/card.types";
import { toast } from "sonner";
import { useState } from "react";

const optionalDay = z.preprocess(
  (val) => (val === "" || val === 0 || val === "0" ? undefined : Number(val)),
  z.number().min(1, "Dia inválido").max(31, "Dia inválido").optional()
) as z.ZodType<number | undefined, any, any>;

const cardSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  lastDigits: z
    .string()
    .length(4, "Deve ter exatamente 4 dígitos")
    .regex(/^\d+$/, "Apenas números")
    .optional()
    .or(z.literal("")),
  color: z.string().optional(),
  closingDay: optionalDay,
  dueDay: optionalDay,
});

type CardFormProps = {
  initialData?: Card;
  inactiveCards?: Card[];
  onSuccess: () => void;
};

export function CardForm({ initialData, inactiveCards = [], onSuccess }: CardFormProps) {
  const { createMutation, updateMutation, restoreMutation } = useCards();
  const [duplicateCard, setDuplicateCard] = useState<Card | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof cardSchema> | null>(null);

  const form = useForm<z.infer<typeof cardSchema>>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      name: initialData?.name || "",
      lastDigits: initialData?.lastDigits || "",
      color: initialData?.color || "#8b5cf6",
      closingDay: initialData?.closingDay || ("" as any),
      dueDay: initialData?.dueDay || ("" as any),
    },
  });

  const isLoading = createMutation.isPending || updateMutation.isPending || restoreMutation.isPending;

  async function onSubmit(values: z.infer<typeof cardSchema>) {
    const dataToSave = {
      ...values,
      lastDigits: values.lastDigits || undefined,
    };

    if (initialData?.id) {
      try {
        await updateMutation.mutateAsync({
          id: initialData.id,
          ...dataToSave,
        });
        toast.success("Cartão atualizado com sucesso");
        onSuccess();
      } catch (error) {
        toast.error("Ocorreu um erro ao salvar o cartão");
      }
      return;
    }

    // Creating - check for duplicates in inactive cards
    const duplicate = inactiveCards.find(
      (c) => c.name.toLowerCase().trim() === values.name.toLowerCase().trim()
    );

    if (duplicate) {
      setDuplicateCard(duplicate);
      setPendingValues(values);
      return; // Wait for user confirmation
    }

    // Normal creation
    try {
      await createMutation.mutateAsync({
        ...dataToSave,
        active: true,
        pendingBills: 0,
      });
      toast.success("Cartão criado com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao criar o cartão");
    }
  }

  const handleRestoreConfirm = async () => {
    if (!duplicateCard || !pendingValues) return;
    
    try {
      const dataToSave = {
        ...pendingValues,
        lastDigits: pendingValues.lastDigits || undefined,
      };

      await updateMutation.mutateAsync({
        id: duplicateCard.id!,
        ...dataToSave,
      });
      await restoreMutation.mutateAsync(duplicateCard.id!);
      
      toast.success("Cartão restaurado e atualizado com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao restaurar o cartão");
    } finally {
      setDuplicateCard(null);
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
                <FormLabel>Nome do Cartão</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Nubank Roxo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="lastDigits"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Últimos 4 Dígitos (Opcional)</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: 1234"
                    maxLength={4}
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Para facilitar identificação visual do cartão.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="closingDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fechamento (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={31} placeholder="Ex: 25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dueDay"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={31} placeholder="Ex: 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

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

      <AlertDialog open={!!duplicateCard} onOpenChange={(open) => !open && setDuplicateCard(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cartão Inativo Encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cartão inativo com o nome "{duplicateCard?.name}". 
              Deseja restaurá-lo e atualizar suas informações com os dados que você acabou de preencher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateCard(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
