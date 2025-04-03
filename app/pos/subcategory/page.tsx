"use client";
import { useState, useEffect } from "react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useFirebaseAnalytics } from "@/lib/firebase-analytics";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  where,
} from "firebase/firestore";
import { EditSubcategoryModal } from "@/src/components/EditSubCategoryModal";
import { DeleteSubcategoryDialog } from "@/src/components/DeleteSubCategorDailog";
import { AddSubcategoryModal } from "@/src/components/AddSubcategoryModal";
import { posDb as db } from "@/firebase/client";
import { useAuth } from "@/lib/auth-context";

interface Category {
  id: string;
  name: string;
  restaurantId?: string;
}

interface Subcategory {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  restaurantId?: string;
}

export default function SubcategoryPage() {
  const { user } = useAuth();
  const restaurantId = user?.uid;

  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedSubcategory, setSelectedSubcategory] = useState<Subcategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useFirebaseAnalytics();

  useEffect(() => {
    if (!restaurantId) return;

    const q = query(
      collection(db, "categories"),
      where("restaurantId", "==", restaurantId),
      orderBy("name")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const categoriesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown Category",
          restaurantId: doc.data().restaurantId,
        }));
        setCategories(categoriesList);
      },
      (error) => {
        console.error("Error fetching categories:", error);
        if (error.code === "failed-precondition" && error.message.includes("requires an index")) {
          toast.error("Categories are loading slowly due to a missing index. Please wait or contact support.");
        } else {
          toast.error("Failed to load categories: " + error.message);
        }
      }
    );

    return () => unsubscribe();
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;

    const q = query(
      collection(db, "subcategories"),
      where("restaurantId", "==", restaurantId),
      orderBy("name")
    );
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const subcategoriesList = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || "Unknown Subcategory",
            description: data.description || "",
            categoryId: data.categoryId,
            restaurantId: data.restaurantId,
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
        if (error.code === "failed-precondition" && error.message.includes("requires an index")) {
          toast.error("Subcategories are loading slowly due to a missing index. Please wait or contact support.");
        } else {
          toast.error("Failed to load subcategories: " + error.message);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [categories, restaurantId]);

  const handleAddSubcategory = async (name: string, description: string, categoryId: string) => {
    if (!restaurantId) {
      toast.error("No restaurant ID found. Please log in again.");
      return;
    }

    try {
      await addDoc(collection(db, "subcategories"), {
        name,
        description: description || "",
        categoryId,
        restaurantId,
      });
      toast.success(`${name} has been added successfully.`);
    } catch (error: any) {
      console.error("Error adding subcategory:", error.message, error.code);
      toast.error(`Failed to add subcategory: ${error.message}`);
    }
  };

  const handleUpdateSubcategory = async (id: string, name: string, description: string, categoryId: string) => {
    if (!restaurantId) {
      toast.error("No restaurant ID found. Please log in again.");
      return;
    }

    try {
      const subcategoryRef = doc(db, "subcategories", id);
      await updateDoc(subcategoryRef, {
        name,
        description: description || "",
        categoryId,
      });
      toast.success(`${name} has been updated successfully.`);
    } catch (error: any) {
      console.error("Error updating subcategory:", error.message, error.code);
      toast.error(`Failed to update subcategory: ${error.message}`);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!selectedSubcategory || !restaurantId) return;

    try {
      const subcategoryRef = doc(db, "subcategories", selectedSubcategory.id);
      await deleteDoc(subcategoryRef);
      toast.success(`${selectedSubcategory.name} has been deleted.`);
      setIsDeleteDialogOpen(false);
    } catch (error: any) {
      console.error("Error deleting subcategory:", error.message, error.code);
      toast.error(`Failed to delete subcategory: ${error.message}`);
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

  if (!restaurantId) {
    return <div>Please log in to view subcategories.</div>;
  }

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
              <TableHead className="w-[100px]">No.</TableHead>
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
              subcategories.map((subcategory, index) => (
                <TableRow key={subcategory.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
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