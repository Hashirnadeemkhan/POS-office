// app/components/RestaurantForm.tsx
'use client';
import { useState } from 'react';

export default function RestaurantForm({ restaurant }: { restaurant?: any }) {
  const [formData, setFormData] = useState({
    name: restaurant?.name || '',
    type: restaurant?.type || '',
    email: restaurant?.email || '',
    password: '',
    ownerName: restaurant?.ownerName || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = restaurant 
      ? `/api/restaurants/${restaurant.id}` 
      : '/api/restaurants';
    const method = restaurant ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      body: JSON.stringify(formData),
      headers: { 'Content-Type': 'application/json' }
    });

    if (res.ok) {
      // Handle success (redirect or show message)
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="Restaurant Name"
      />
      <input
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        placeholder="Restaurant Type"
      />
      <input
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        placeholder="Email"
      />
      {!restaurant && (
        <input
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Password"
        />
      )}
      <input
        value={formData.ownerName}
        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
        placeholder="Owner Name"
      />
      <button type="submit">{restaurant ? 'Update' : 'Create'}</button>
    </form>
  );
}

