import React from 'react';

interface PropertyCardProps {
  id: string;
  price: number;
  propertyType: string;
  description: string;
  numRooms: number;
  address: string;
  onBook: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
  id,
  price,
  propertyType,
  description,
  numRooms,
  address,
  onBook,
}) => {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="h-40 bg-gray-200 rounded-md mb-4"></div>
      <h3 className="text-lg font-semibold">{propertyType}</h3>
      <p className="text-gray-600 text-sm mb-2">{address}</p>
      <p className="text-gray-700 mb-2">{description}</p>
      <p className="text-sm text-gray-600 mb-3">Rooms: {numRooms}</p>
      <div className="flex justify-between items-center">
        <p className="font-bold">{price} SUI <span className="text-sm font-normal">/ night</span></p>
        <button
          onClick={() => onBook(id)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm"
        >
          Book Now
        </button>
      </div>
    </div>
  );
};
