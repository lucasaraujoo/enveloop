"use client";

import { useCards } from "@/features/cards/hooks/useCards";
import { Button } from "@/components/ui/button";
import { Card as CardUI, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash, CreditCard, ArchiveRestore, Filter } from "lucide-react";
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
import { CardForm } from "@/features/cards/components/CardForm";
import { Card } from "@/types/card.types";

export default function CardsPage() {
  const { cardsQuery, activeCards, inactiveCards, deleteMutation, restoreMutation } = useCards();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // AlertDialog state
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null);

  const handleEdit = (card: Card) => {
    setEditingCard(card);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCard(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!cardToDelete) return;
    try {
      await deleteMutation.mutateAsync(cardToDelete.id!);
      toast.success("Cartão excluído com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir cartão");
    } finally {
      setCardToDelete(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("Cartão restaurado com sucesso");
    } catch (e) {
      toast.error("Erro ao restaurar cartão");
    }
  };

  const displayCards = showInactive ? inactiveCards : activeCards;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Cartões de Crédito</h1>
          {showInactive && (
            <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive">
              Exibindo Inativos
            </span>
          )}
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
            <Plus className="mr-2 h-4 w-4" /> Novo Cartão
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {cardsQuery.isLoading && (
          <div className="col-span-full flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!cardsQuery.isLoading && displayCards.map((card) => (
          <CardUI key={card.id} className={showInactive ? "opacity-70 grayscale" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: card.color || "#8b5cf6" }}
                />
                {card.name}
              </CardTitle>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                <span className="text-sm">
                  {card.lastDigits ? `•••• ${card.lastDigits}` : "----"}
                </span>
              </div>
            </CardHeader>
            <CardContent>


              {/* Fatura pendente */}
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">Fatura pendente</p>
                <p className={`text-lg font-semibold ${(card.pendingBills ?? 0) > 0 ? "text-red-500" : (card.pendingBills ?? 0) < 0 ? "text-emerald-500" : "text-foreground"}`}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(card.pendingBills ?? 0)}
                </p>
                {(card.pendingBills ?? 0) < 0 && (
                  <p className="text-xs text-emerald-600 mt-0.5">
                    Crédito por estorno — será abatido da próxima fatura
                  </p>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {!showInactive ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(card)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCardToDelete(card)}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRestore(card.id!)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                )}
              </div>
            </CardContent>
          </CardUI>
        ))}
        {!cardsQuery.isLoading && displayCards.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            {showInactive ? "Nenhum cartão inativo." : "Nenhum cartão cadastrado ou ativo."}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCard ? "Editar Cartão" : "Novo Cartão"}
            </DialogTitle>
          </DialogHeader>
          <CardForm
            initialData={editingCard || undefined}
            inactiveCards={inactiveCards}
            onSuccess={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cardToDelete} onOpenChange={(open) => !open && setCardToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cartão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cartão "{cardToDelete?.name}"?
              <br /><br />
              <strong>Atenção:</strong> Ao excluir este cartão, suas faturas pendentes não serão mais contabilizadas na Dashboard geral. Os lançamentos vinculados a ele ainda serão mantidos.
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
