"use client";

import { useEnvelopes } from "@/features/envelopes/hooks/useEnvelopes";
import { Button } from "@/components/ui/button";
import { Card as CardUI, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash, ArrowUp, ArrowDown, ArchiveRestore, Filter } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EnvelopeForm } from "@/features/envelopes/components/EnvelopeForm";
import { Envelope } from "@/types/envelope.types";

export default function EnvelopesPage() {
  const { envelopesQuery, activeEnvelopes, inactiveEnvelopes, deleteMutation, updateMutation, restoreMutation } = useEnvelopes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEnvelope, setEditingEnvelope] = useState<Envelope | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // AlertDialog state
  const [envelopeToDelete, setEnvelopeToDelete] = useState<Envelope | null>(null);

  const handleEdit = (envelope: Envelope) => {
    setEditingEnvelope(envelope);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingEnvelope(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!envelopeToDelete) return;
    try {
      await deleteMutation.mutateAsync(envelopeToDelete.id!);
      toast.success("Envelope excluído com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir envelope");
    } finally {
      setEnvelopeToDelete(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("Envelope restaurado com sucesso");
    } catch (e) {
      toast.error("Erro ao restaurar envelope");
    }
  };

  const displayEnvelopes = showInactive ? inactiveEnvelopes : activeEnvelopes;
  const nextOrder = activeEnvelopes.length > 0 ? Math.max(...activeEnvelopes.map(e => e.order)) + 1 : 1;

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (showInactive) return; // Disallow reordering inactive
    
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === displayEnvelopes.length - 1)
    ) {
      return;
    }

    const current = displayEnvelopes[index];
    const swapWith = direction === 'up' ? displayEnvelopes[index - 1] : displayEnvelopes[index + 1];

    try {
      await Promise.all([
        updateMutation.mutateAsync({ id: current.id!, order: swapWith.order }),
        updateMutation.mutateAsync({ id: swapWith.id!, order: current.order }),
      ]);
    } catch (e) {
      toast.error("Erro ao reordenar envelopes");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold tracking-tight">Envelopes Padrão</h1>
            {showInactive && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                Exibindo Inativos
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">
            Configure seus limites mensais para planejamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2">
              <Filter className="h-4 w-4" />
              Filtros
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowInactive(false)} className={!showInactive ? "bg-muted" : ""}>
                Mostrar Ativos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowInactive(true)} className={showInactive ? "bg-muted" : ""}>
                Mostrar Excluídos/Inativos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" /> Novo Envelope
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {envelopesQuery.isLoading && (
          <div className="col-span-full flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!envelopesQuery.isLoading && displayEnvelopes.map((envelope, index) => (
          <CardUI key={envelope.id} className={showInactive ? "opacity-70 grayscale" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <div
                  className="h-4 w-4 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: envelope.color || "#ccc" }}
                />
                <span className="min-w-0 break-words">{envelope.name}</span>
              </CardTitle>
              {!showInactive && (
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    disabled={index === 0}
                    onClick={() => handleMove(index, 'up')}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    disabled={index === displayEnvelopes.length - 1}
                    onClick={() => handleMove(index, 'down')}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(envelope.defaultAmount)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Limite padrão
              </p>
              <div className="mt-4 flex gap-2">
                {!showInactive ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(envelope)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setEnvelopeToDelete(envelope)}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRestore(envelope.id!)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                )}
              </div>
            </CardContent>
          </CardUI>
        ))}
        {!envelopesQuery.isLoading && displayEnvelopes.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            {showInactive ? "Nenhum envelope inativo." : "Nenhum envelope cadastrado ou ativo."}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEnvelope ? "Editar Envelope" : "Novo Envelope"}
            </DialogTitle>
          </DialogHeader>
          <EnvelopeForm
            initialData={editingEnvelope || undefined}
            inactiveEnvelopes={inactiveEnvelopes}
            nextOrder={nextOrder}
            onSuccess={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!envelopeToDelete} onOpenChange={(open) => !open && setEnvelopeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Envelope</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o envelope "{envelopeToDelete?.name}"?
              <br /><br />
              <strong>Atenção:</strong> Ao excluir este envelope, ele não aparecerá mais nos planejamentos futuros da Dashboard. Os lançamentos vinculados a ele ainda serão mantidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
