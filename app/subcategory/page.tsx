"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { collection, addDoc, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot } from "firebase/firestore";
import { EditSubcategoryModal } from "@/src/components/EditSubCategoryModal";
import { DeleteSubcategoryDialog } from "@/src/components/DeleteSubCategorDailog";
import { AddSubcategoryModal } from "@/src/components/AddSubcategoryModal";
import { db } from "@/lib/firebase";
import { useFirebaseAnalytics } from "@/lib/firebase-analytics";

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
}

export default function SubcategoryPage() {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Firebase Analytics
  useFirebaseAnalytics();

  useEffect(() => {
    const q = query(collection(db, "categories"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setCategories(categoriesList);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories.");
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "subcategories"), orderBy("name"));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const subcategoriesList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description || "",
            categoryId: data.categoryId,
          };
        });

        const subcategoriesWithCategoryNames = subcategoriesList.map((subcategory) => {
          const category = categories.find((cat) => cat.id === subcategory.categoryId);
          return {
            ...subcategory,
            categoryName: category?.name || "Unknown Category",
          };
        });

        setSubcategories(subcategoriesWithCategoryNames);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching subcategories:", error);
        toast.error("Failed to load subcategories.");
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [categories]);

  const handleAddSubcategory = async (name: string, description: string, categoryId: string) => {
    try {
      await addDoc(collection(db, "subcategories"), {
        name,
        description: description || "",
        categoryId,
      });
      toast.success(`${name} has been added successfully.`);
    } catch (error) {
      console.error("Error adding subcategory:", error);
      toast.error("Failed to add subcategory.");
    }
  };

  const handleUpdateSubcategory = async (id: string, name: string, description: string, categoryId: string) => {
    try {
      const subcategoryRef = doc(db, "subcategories", id);
      await updateDoc(subcategoryRef, {
        name,
        description: description || "",
        categoryId,
      });
      toast.success(`${name} has been updated successfully.`);
    } catch (error) {
      console.error("Error updating subcategory:", error);
      toast.error("Failed to update subcategory.");
    }
  };

  const handleDeleteSubcategory = async () => {
    if (selectedSubcategory) {
      try {
        const subcategoryRef = doc(db, "subcategories", selectedSubcategory.id);
        await deleteDoc(subcategoryRef);
        toast.error(`${selectedSubcategory.name} has been deleted.`);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting subcategory:", error);
        toast.error("Failed to delete subcategory.");
      }
    }
  };

  const handleEditSubcategory = (id: string) => {
    const subcategory = subcategories.find((s) => s.id === id);
    if (subcategory) {
      setSelectedSubcategory(subcategory);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteClick = (id: string) => {
    const subcategory = subcategories.find((s) => s.id === id);
    if (subcategory) {
      setSelectedSubcategory(subcategory);
      setIsDeleteDialogOpen(true);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Subcategories</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-black text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Subcategory
        </Button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableCaption>Manage your product subcategories</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  Loading subcategories...
                </TableCell>
              </TableRow>
            ) : subcategories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                  No subcategories found. Add a subcategory to get started.
                </TableCell>
              </TableRow>
            ) : (
              subcategories.map((subcategory) => (
                <TableRow key={subcategory.id}>
                  <TableCell className="font-medium">{subcategory.id}</TableCell>
                  <TableCell>{subcategory.name}</TableCell>
                  <TableCell>{subcategory.description}</TableCell>
                  <TableCell>{subcategory.categoryName}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mr-2"
                      onClick={() => handleEditSubcategory(subcategory.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteClick(subcategory.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AddSubcategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddSubcategory={handleAddSubcategory}
        categories={categories}
      />
      <EditSubcategoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateSubcategory={handleUpdateSubcategory}
        subcategory={selectedSubcategory}
        categories={categories}
      />
      <DeleteSubcategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSubcategory}
        subcategoryName={selectedSubcategory?.name || ""}
      />
    </div>
  );
}