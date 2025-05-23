import { useState } from "react";
import "./App.css";
import { Navbar } from "./components/Navbar";
import { PropertyCard } from "./components/PropertyCard";

const mockImages = [
	"https://fakeimg.pl/600x400",
	"https://fakeimg.pl/600x400",
	"https://fakeimg.pl/600x400",
];
const mockProperties = [
	{
		id: "0x123",
		price: 100,
		propertyType: "Apartment",
		description: "Cozy apartment in the city center",
		numRooms: 2,
		address: "123 Main St, City",
		images: mockImages,
	},
	{
		id: "0x456",
		price: 50,
		propertyType: "Room",
		description: "Private room with beautiful view",
		numRooms: 1,
		address: "456 Park Ave, City",
		images: mockImages,
	},
	{
		id: "0x789",
		price: 200,
		propertyType: "Hotel Room",
		description: "Luxury hotel room with all amenities",
		numRooms: 1,
		address: "789 Ocean Blvd, City",
		images: mockImages,
	},
];

const Home: React.FC = () => {
	const [properties] = useState(mockProperties);

	const handleBookProperty = (id: string) => {
		alert(`Booking property ${id}. Wallet connection required.`);
	};

	return (
		<div className="min-h-screen bg-background">
			<Navbar />
			<div className="container mx-auto p-4 mt-8">
				<h1 className="text-2xl font-bold mb-6">Available Properties</h1>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{properties.map((property) => (
						<PropertyCard
							key={property.id}
							id={property.id}
							price={property.price}
							propertyType={property.propertyType}
							description={property.description}
							numRooms={property.numRooms}
							address={property.address}
							images={property.images}
							onBook={handleBookProperty}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default Home;
