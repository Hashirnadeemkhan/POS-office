import { useInventory } from "@/hooks/use-inventory"

interface ProductStockBadgeProps {
  productId: string
  variantId?: string
  showQuantity?: boolean
}

export function ProductStockBadge({ productId, variantId, showQuantity = true }: ProductStockBadgeProps) {
  const { getProductStock } = useInventory()
  const stock = getProductStock(productId, variantId)
  
  if (!stock) return null
  
  const { availableStock, orderedQuantity, totalStock } = stock
  
  return (
    <div className="flex flex-wrap gap-2">
      {showQuantity && (
        <div className={`text-xs px-2 py-1 rounded-full inline-block ${
          availableStock > 0 
            ? "bg-green-100 text-green-800" 
            : "bg-red-100 text-red-600 font-medium"
        }`}>
          {availableStock > 0 
            ? `${availableStock} available` 
            : "Out of stock"}
        </div>
      )}
      
      {orderedQuantity > 0 && (
        <div className="text-xs px-2 py-1 rounded-full inline-block bg-amber-100 text-amber-800">
          {orderedQuantity} ordered
        </div>
      )}
      
      {!showQuantity && availableStock === 0 && (
        <div className="text-xs px-2 py-1 rounded-full inline-block bg-red-100 text-red-600 font-medium">
          Out of stock
        </div>
      )}
    </div>
  )
}
