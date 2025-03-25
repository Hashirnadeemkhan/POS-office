"use client";
import React from "react"
import { useState, useEffect } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { PlusCircle, Pencil, Trash2 } from 'lucide-react';
import { AddCategoryModal } from "@/src/components/AddCategoryModal";
import { EditCategoryModal } from "@/src/components/Edit-category-dailog";
import { DeleteCategoryDialog } from "@/src/components/Delete-category-dialog";
import { toast } from "sonner";
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useFirebaseAnalytics } from "@/lib/firebase-analytics";

interface Category {
  id: string;
  name: string;
  description: string;
}

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubcategories, setHasSubcategories] = useState(false);

  // Initialize Firebase Analytics (runs only in browser)
  useFirebaseAnalytics();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, "categories"), orderBy("name"));
        const querySnapshot = await getDocs(q);
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          description: doc.data().description || "",
        }));
        setCategories(categoriesList);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast.error("Failed to load categories.");
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleAddCategory = async (name: string, description: string) => {
    try {
      const docRef = await addDoc(collection(db, "categories"), {
        name,
        description: description || "",
      });
      setCategories([...categories, { id: docRef.id, name, description: description || "" }]);
      toast.success(`${name} has been added successfully.`);
    } catch (error) {
      console.error("Error adding category:", error);
      toast.error("Failed to add category.");
    }
  };

  const handleUpdateCategory = async (id: string, name: string, description: string) => {
    try {
      const categoryRef = doc(db, "categories", id);
      await updateDoc(categoryRef, { name, description: description || "" });
      setCategories(categories.map((cat) => (cat.id === id ? { id, name, description } : cat)));
      toast.success(`${name} has been updated successfully.`);
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category.");
    }
  };

  const checkForSubcategories = async (categoryId: string) => {
    try {
      const q = query(collection(db, "subcategories"), where("categoryId", "==", categoryId));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error("Error checking subcategories:", error);
      return false;
    }
  };

  const handleDeleteCategory = async () => {
    if (selectedCategory) {
      try {
        const hasSubcats = await checkForSubcategories(selectedCategory.id);
        if (hasSubcats) {
          toast.error(`Cannot delete ${selectedCategory.name}. Please delete all subcategories first.`);
          setIsDeleteDialogOpen(false);
          return;
        }

        const categoryRef = doc(db, "categories", selectedCategory.id);
        await deleteDoc(categoryRef);
        setCategories(categories.filter((cat) => cat.id !== selectedCategory.id));
        toast.error(`${selectedCategory.name} has been deleted.`);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error("Error deleting category:", error);
        toast.error("Failed to delete category.");
      }
    }
  };

  const handleEditCategory = (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      setSelectedCategory(category);
      setIsEditModalOpen(true);
    }
  };

  const handleDeleteClick = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    if (category) {
      setSelectedCategory(category);
      const hasSubcats = await checkForSubcategories(id);
      setHasSubcategories(hasSubcats);
      setIsDeleteDialogOpen(true);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Categories</h1>
        <Button onClick={() => setIsAddModalOpen(true)} className="bg-black text-white">
          <PlusCircle className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableCaption>Manage your product categories</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  Loading categories...
                </TableCell>
              </TableRow>
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                  No categories found. Add a category to get started.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category, index) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="mr-2" onClick={() => handleEditCategory(category.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteClick(category.id)}
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

      <AddCategoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCategory={handleAddCategory}
      />
      <EditCategoryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdateCategory={handleUpdateCategory}
        category={selectedCategory}
      />
      <DeleteCategoryDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteCategory}
        categoryName={selectedCategory?.name || ""}
        hasSubcategories={hasSubcategories}
      />
    </div>
  );
}
