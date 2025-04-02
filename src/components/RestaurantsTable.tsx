// src/components/RestaurantsTable.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PlusCircle, Eye, Pencil, Trash2, Power, PowerOff, MoreHorizontal } from "lucide-react";
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

interface Restaurant {
  id: string;
  name: string;
  email: string;
  ownerName: string;
  activationToken: string;
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
  tokenExpiresAt?: string;
}

interface RestaurantsTableProps {
  showViewAllButton?: boolean;
}

export default function RestaurantsTable({ showViewAllButton = true }: RestaurantsTableProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<string | null>(null);
  const router = useRouter();

  const fetchRestaurants = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = showViewAllButton ? "/api/restaurants/get?limit=3" : "/api/restaurants/get";
      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch restaurants");
      }

      const restaurantsList: Restaurant[] = data.restaurants.map((restaurant: any) => ({
        ...restaurant,
        createdAt: restaurant.createdAt,
        lastUpdated: restaurant.lastUpdated,
        tokenExpiresAt: restaurant.tokenExpiresAt,
      }));

      setRestaurants(restaurantsList);
    } catch (error) {
      console.error("Error fetching restaurants:", error);
      toast.error("Failed to load restaurants");
    } finally {
      setIsLoading(false);
    }
  }, [showViewAllButton]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/restaurants/update/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update status");
      }

      setRestaurants(
        restaurants.map((restaurant) =>
          restaurant.id === id
            ? { ...restaurant, isActive: !currentStatus, lastUpdated: new Date().toISOString() }
            : restaurant
        )
      );
      toast.success(`Restaurant ${currentStatus ? "deactivated" : "activated"} successfully`);
    } catch (error) {
      console.error("Error updating restaurant status:", error);
      toast.error("Failed to update restaurant status");
    }
  };

  const handleDeleteClick = (id: string) => {
    setRestaurantToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!restaurantToDelete) return;
    try {
      const response = await fetch(`/api/restaurants/delete/${restaurantToDelete}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete restaurant");
      }

      setRestaurants(restaurants.filter((restaurant) => restaurant.id !== restaurantToDelete));
      toast.success("Restaurant deleted successfully");
    } catch (error) {
      console.error("Error deleting restaurant:", error);
      toast.error("Failed to delete restaurant");
    } finally {
      setDeleteDialogOpen(false);
      setRestaurantToDelete(null);
    }
  };

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Restaurant Accounts</h1>
        <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => router.push("/admin/restaurants/create")}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Restaurant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Restaurants</CardTitle>
          <CardDescription>
            {showViewAllButton ? "Showing the 3 most recent restaurant accounts." : "All restaurant accounts."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Restaurant Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    <div className="flex justify-center">
                      <div className="w-6 h-6 border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                      <span className="ml-2">Loading restaurants...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : restaurants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10">
                    No restaurants found. Add a restaurant to get started.
                  </TableCell>
                </TableRow>
              ) : (
                restaurants.map((restaurant, index) => (
                  <TableRow key={restaurant.id}>
                    <TableCell className="font-medium text-center">
                      <Badge variant="outline" className="bg-gray-100 text-gray-800">
                        {index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{restaurant.name}</TableCell>
                    <TableCell>{restaurant.ownerName}</TableCell>
                    <TableCell>{restaurant.email}</TableCell>
                    <TableCell>
                      <Badge
                        variant={restaurant.isActive ? "default" : "outline"}
                        className={
                          restaurant.isActive
                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                            : "text-red-800 border-red-300 bg-red-50 hover:bg-red-50 hover:text-red-800"
                        }
                      >
                        {restaurant.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(restaurant.createdAt), { addSuffix: true })}</TableCell>
                    <TableCell>{formatDistanceToNow(new Date(restaurant.lastUpdated), { addSuffix: true })}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant={restaurant.isActive ? "destructive" : "outline"}
                          size="sm"
                          className={
                            restaurant.isActive
                              ? "bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900 border-red-200"
                              : "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 border-green-200"
                          }
                          onClick={() => handleToggleStatus(restaurant.id, restaurant.isActive)}
                        >
                          {restaurant.isActive ? (
                            <>
                              <PowerOff className="mr-1 h-3 w-3" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <Power className="mr-1 h-3 w-3" />
                              Activate
                            </>
                          )}
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/restaurants/view/${restaurant.id}`)}>
                              <Eye className="mr-2 h-4 w-4 text-blue-600" />
                              <span className="text-blue-600">View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/admin/restaurants/edit/${restaurant.id}`)}>
                              <Pencil className="mr-2 h-4 w-4 text-amber-600" />
                              <span className="text-amber-600">Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteClick(restaurant.id)}>
                              <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                              <span className="text-red-600">Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {showViewAllButton && (
            <div className="flex justify-center mt-6">
              <Link href={"/admin/restaurants"}>
                <Button className="bg-purple-600 hover:bg-purple-700">View All Restaurants</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this restaurant?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the restaurant account and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}