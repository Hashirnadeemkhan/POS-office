"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DeleteCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  categoryName: string
  hasSubcategories?: boolean
}

export function DeleteCategoryDialog({
  isOpen,
  onClose,
  onConfirm,
  categoryName,
  hasSubcategories = false,
}: DeleteCategoryDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            {hasSubcategories ? (
              <>
                Cannot delete <strong className="text-foreground">{categoryName}</strong>. Please delete all
                subcategories in this category first.
              </>
            ) : (
              <>
                This will permanently delete the category <strong className="text-foreground">{categoryName}</strong>.
                This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {!hasSubcategories && (
            <AlertDialogAction
              onClick={onConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

