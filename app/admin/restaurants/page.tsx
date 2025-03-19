// pages/restaurant.tsx
import RestaurantsTable from '@/src/components/RestaurantsTable'
import React from 'react'

const RestaurantPage = () => {
  return (
    <div>
      <RestaurantsTable showViewAllButton={false} />
    </div>
  )
}

export default RestaurantPage