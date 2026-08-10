"use client";

import { useCategories } from "@/features/categories/hooks/useCategories";
import { Button } from "@/components/ui/button";
import { Card as CardUI, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash, ArchiveRestore, Filter } from "lucide-react";
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
import { CategoryForm } from "@/features/categories/components/CategoryForm";
import { Category } from "@/types/category.types";

export default function CategoriesPage() {
  const { categoriesQuery, activeCategories, inactiveCategories, deleteMutation, restoreMutation } = useCategories();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  // AlertDialog state
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteMutation.mutateAsync(categoryToDelete.id!);
      toast.success("Categoria excluída com sucesso");
    } catch (e) {
      toast.error("Erro ao excluir categoria");
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreMutation.mutateAsync(id);
      toast.success("Categoria restaurada com sucesso");
    } catch (e) {
      toast.error("Erro ao restaurar categoria");
    }
  };

  const displayCategories = showInactive ? inactiveCategories : activeCategories;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Categorias</h1>
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
            <Plus className="mr-2 h-4 w-4" /> Nova Categoria
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categoriesQuery.isLoading && (
          <div className="col-span-full flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}
        {!categoriesQuery.isLoading && displayCategories.map((category) => (
          <CardUI key={category.id} className={showInactive ? "opacity-70 grayscale" : ""}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-medium">
                {category.name}
              </CardTitle>
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: category.color || "#ccc" }}
              />
            </CardHeader>
            <CardContent>
              <div className="mt-4 flex gap-2">
                {!showInactive ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(category)}>
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setCategoryToDelete(category)}
                    >
                      <Trash className="mr-2 h-4 w-4" /> Excluir
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => handleRestore(category.id!)}>
                    <ArchiveRestore className="mr-2 h-4 w-4" /> Restaurar
                  </Button>
                )}
              </div>
            </CardContent>
          </CardUI>
        ))}
        {!categoriesQuery.isLoading && displayCategories.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            {showInactive ? "Nenhuma categoria inativa." : "Nenhuma categoria cadastrada ou ativa."}
          </div>
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? "Editar Categoria" : "Nova Categoria"}
            </DialogTitle>
          </DialogHeader>
          <CategoryForm
            initialData={editingCategory || undefined}
            inactiveCategories={inactiveCategories}
            onSuccess={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!categoryToDelete} onOpenChange={(open) => !open && setCategoryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{categoryToDelete?.name}"?
              <br /><br />
              Os lançamentos vinculados a ela ainda serão mantidos.
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
