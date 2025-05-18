import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons"; // Using Radix icons for chevrons
import {
	AspectRatio,
	Box,
	Button,
	Card,
	Flex,
	Heading,
	ScrollArea,
	Text,
} from "@radix-ui/themes";
import type React from "react";
import { useState } from "react";

interface PropertyCardProps {
	id: string;
	price: number;
	propertyType: string;
	description: string;
	numRooms: number;
	address: string;
	images?: string[]; // Optional: actual image URLs
	onBook: (id: string) => void;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({
	id,
	price,
	propertyType,
	description,
	numRooms,
	address,
	images = [], // Default to empty array
	onBook,
}) => {
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const totalImages = images.length;

	const handlePrevImage = () => {
		if (totalImages === 0) return;
		setCurrentImageIndex(
			(prevIndex) => (prevIndex - 1 + totalImages) % totalImages,
		);
	};

	const handleNextImage = () => {
		if (totalImages === 0) return;
		setCurrentImageIndex((prevIndex) => (prevIndex + 1) % totalImages);
	};

	return (
		<Card size="2" style={{ width: "100%", maxWidth: "380px" }}>
			<Box style={{ position: "relative" }}>
				<AspectRatio ratio={16 / 9}>
					{totalImages > 0 ? (
						<ScrollArea
							scrollbars="horizontal"
							style={{ borderRadius: "var(--radius-3)" }}
						>
							<Flex style={{ width: `${totalImages * 100}%` }}>
								{images.map((imageSrc, index) => (
									<Box
										key={`property-${id}-slide-${
											// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
											index
										}`}
										style={{
											width: `${100 / totalImages}%`,
											transform: `translateX(-${currentImageIndex * 100}%)`,
											transition: "transform 0.3s ease-in-out",
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											height: "100%",
											backgroundColor: imageSrc
												? "transparent"
												: `var(--slate-a${index + 3})`,
										}}
									>
										<img
											src={imageSrc}
											alt={`View of ${propertyType} ${index + 1}`}
											style={{
												width: "100%",
												height: "100%",
												objectFit: "cover",
											}}
										/>
									</Box>
								))}
							</Flex>
						</ScrollArea>
					) : (
						<Box
							style={{
								backgroundColor: "var(--slate-a3)", // Single placeholder color
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								height: "100%",
								borderRadius: "var(--radius-3)",
							}}
						>
							<Text size="1" highContrast>
								No Images Available
							</Text>
						</Box>
					)}
				</AspectRatio>
				{totalImages > 1 && (
					<>
						<Button
							variant="solid"
							color="gray"
							highContrast
							size="1"
							onClick={handlePrevImage}
							style={{
								position: "absolute",
								top: "50%",
								left: "8px",
								transform: "translateY(-50%)",
								zIndex: 1,
								padding: "var(--space-1)",
								cursor: "pointer",
							}}
						>
							<ChevronLeftIcon width="18" height="18" />
						</Button>
						<Button
							variant="solid"
							color="gray"
							highContrast
							size="1"
							onClick={handleNextImage}
							style={{
								position: "absolute",
								top: "50%",
								right: "8px",
								transform: "translateY(-50%)",
								zIndex: 1,
								padding: "var(--space-1)",
								cursor: "pointer",
							}}
						>
							<ChevronRightIcon width="18" height="18" />
						</Button>
						<Flex
							gap="1"
							justify="center"
							style={{
								position: "absolute",
								bottom: "8px",
								left: "50%",
								transform: "translateX(-50%)",
								zIndex: 1,
							}}
						>
							{images.map((_, index) => (
								<Box
									key={`property-${id}-indicator-${
										// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
										index
									}`}
									style={{
										width: "8px",
										height: "8px",
										borderRadius: "50%",
										backgroundColor:
											currentImageIndex === index
												? "var(--cyan-9)"
												: "var(--gray-a7)",
										transition: "background-color 0.3s ease",
									}}
								/>
							))}
						</Flex>
					</>
				)}
			</Box>

			<Flex direction="column" gap="2" p="3">
				<Heading as="h3" size="4" trim="start">
					{propertyType}
				</Heading>
				<Text as="p" size="2" color="gray">
					{address}
				</Text>
				<Text
					as="p"
					size="2"
					style={{
						minHeight: "40px",
						WebkitLineClamp: 2,
						display: "-webkit-box",
						WebkitBoxOrient: "vertical",
						overflow: "hidden",
					}}
				>
					{description}
				</Text>
				<Text as="p" size="2" color="gray">
					Rooms: {numRooms}
				</Text>
				<Flex justify="between" align="center" mt="2">
					<Text weight="bold" size="4">
						{price} SUI{" "}
						<Text as="span" size="2" color="gray">
							/ night
						</Text>
					</Text>
					<Button size="2" onClick={() => onBook(id)} highContrast>
						Book Now
					</Button>
				</Flex>
			</Flex>
		</Card>
	);
};
