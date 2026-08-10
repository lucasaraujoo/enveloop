"use client";

import { useForm, useFieldArray } from "react-hook-form";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { Envelope } from "@/types/envelope.types";
import { toast } from "sonner";
import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const currentYear = new Date().getFullYear();

const envelopeSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  type: z.enum(["default", "temporary"]),
  defaultAmount: z.number({ message: "Digite um valor numérico" }),
  color: z.string().optional(),
  targetMonths: z
    .array(
      z.object({
        month: z.number().min(1).max(12),
        year: z.number().min(2020),
      })
    )
    .optional(),
});

type EnvelopeFormProps = {
  initialData?: Envelope;
  inactiveEnvelopes?: Envelope[];
  nextOrder: number;
  onSuccess: () => void;
};

export function EnvelopeForm({ initialData, inactiveEnvelopes = [], nextOrder, onSuccess }: EnvelopeFormProps) {
  const { createMutation, updateMutation, restoreMutation } = useEnvelopes();
  const [duplicateEnvelope, setDuplicateEnvelope] = useState<Envelope | null>(null);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof envelopeSchema> | null>(null);

  const form = useForm<z.infer<typeof envelopeSchema>>({
    resolver: zodResolver(envelopeSchema),
    defaultValues: {
      name: initialData?.name || "",
      type: initialData?.type || "default",
      defaultAmount: initialData?.defaultAmount || 0,
      color: initialData?.color || "#f59e0b",
      targetMonths: initialData?.targetMonths || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "targetMonths",
  });

  const watchType = form.watch("type");
  const isLoading = createMutation.isPending || updateMutation.isPending || restoreMutation.isPending;

  async function onSubmit(values: z.infer<typeof envelopeSchema>) {
    const base = {
      name: values.name,
      type: values.type,
      defaultAmount: values.defaultAmount,
      color: values.color,
    };
    const dataToSave =
      values.type === "temporary" && values.targetMonths?.length
        ? { ...base, targetMonths: values.targetMonths }
        : base;

    if (initialData?.id) {
      try {
        await updateMutation.mutateAsync({
          id: initialData.id,
          ...dataToSave,
        });
        toast.success("Envelope atualizado com sucesso");
        onSuccess();
      } catch (error) {
        toast.error("Ocorreu um erro ao salvar o envelope");
      }
      return;
    }

    // Creating - check for duplicates in inactive envelopes
    const duplicate = inactiveEnvelopes.find(
      (e) => e.name.toLowerCase().trim() === values.name.toLowerCase().trim()
    );

    if (duplicate) {
      setDuplicateEnvelope(duplicate);
      setPendingValues(values);
      return; // Wait for user confirmation
    }

    // Normal creation
    try {
      await createMutation.mutateAsync({
        ...dataToSave,
        order: nextOrder,
        active: true,
      });
      toast.success("Envelope criado com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao criar o envelope");
    }
  }

  const handleRestoreConfirm = async () => {
    if (!duplicateEnvelope || !pendingValues) return;
    
    try {
      const base = {
        name: pendingValues.name,
        type: pendingValues.type,
        defaultAmount: pendingValues.defaultAmount,
        color: pendingValues.color,
      };
      const dataToSave =
        pendingValues.type === "temporary" && pendingValues.targetMonths?.length
          ? { ...base, targetMonths: pendingValues.targetMonths }
          : base;

      await updateMutation.mutateAsync({
        id: duplicateEnvelope.id!,
        ...dataToSave,
        order: nextOrder, // Might need to be placed at the end when restored
      });
      await restoreMutation.mutateAsync(duplicateEnvelope.id!);
      
      toast.success("Envelope restaurado e atualizado com sucesso");
      onSuccess();
    } catch (error) {
      toast.error("Erro ao restaurar o envelope");
    } finally {
      setDuplicateEnvelope(null);
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
                <FormLabel>Nome do Envelope</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Supermercado" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo">
                        {field.value === "default" ? "Padrão (aparece todo mês)" : field.value === "temporary" ? "Temporário (meses específicos)" : "Selecione o tipo"}
                      </SelectValue>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="default">Padrão (aparece todo mês)</SelectItem>
                    <SelectItem value="temporary">Temporário (meses específicos)</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {watchType === "default"
                    ? "Envelopes padrão aparecem em todos os meses futuros enquanto estiverem ativos."
                    : "Envelopes temporários só aparecem nos meses que você definir."}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="defaultAmount"
            render={({ field }) => {
              const displayValue = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(field.value || 0);

              return (
                <FormItem>
                  <FormLabel>Limite Mensal Padrão (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={displayValue}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        const numeric = digits ? parseInt(digits, 10) : 0;
                        field.onChange(numeric);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {watchType === "temporary" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">Meses Ativos</label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ month: new Date().getMonth() + 1, year: currentYear })}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Adicionar Mês
                </Button>
              </div>
              {fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum mês adicionado. Adicione ao menos um mês para o envelope temporário.
                </p>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`targetMonths.${index}.month`}
                    render={({ field }) => (
                      <Select
                        onValueChange={(v) => field.onChange(Number(v))}
                        value={String(field.value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map((m) => (
                            <SelectItem key={m.value} value={String(m.value)}>
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`targetMonths.${index}.year`}
                    render={({ field }) => (
                      <Input
                        type="number"
                        className="w-24"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

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

      <AlertDialog open={!!duplicateEnvelope} onOpenChange={(open) => !open && setDuplicateEnvelope(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Envelope Inativo Encontrado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um envelope inativo com o nome "{duplicateEnvelope?.name}". 
              Deseja restaurá-lo e atualizar suas informações com os dados que você acabou de preencher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDuplicateEnvelope(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreConfirm}>
              Restaurar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
