import mongoose from "mongoose";
import dotenv from "dotenv";
import User, { IUser } from "../models/User";
import Property, { IProperty } from "../models/Property";
import Booking, { IBooking } from "../models/Booking";

// Load environment variables
dotenv.config();

// Sample data
const sampleUsers = [
    // Hosts
    {
        googleId: "host001",
        email: "john.smith@gmail.com",
        name: "John Smith",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        role: "host",
        phone: "+1-555-0101",
        bio: "Experienced host with 5+ years in hospitality. Love meeting new people and sharing local insights!",
        isVerified: true,
    },
    {
        googleId: "host002",
        email: "sarah.johnson@gmail.com",
        name: "Sarah Johnson",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b64db678?w=150&h=150&fit=crop&crop=face",
        role: "host",
        phone: "+1-555-0102",
        bio: "Interior designer turned Airbnb host. My spaces are carefully curated for comfort and style.",
        isVerified: true,
    },
    {
        googleId: "host003",
        email: "michael.brown@gmail.com",
        name: "Michael Brown",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
        role: "host",
        phone: "+1-555-0103",
        bio: "Local guide and property owner. I know all the best spots in the city!",
        isVerified: true,
    },
    {
        googleId: "host004",
        email: "emily.davis@gmail.com",
        name: "Emily Davis",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
        role: "host",
        phone: "+1-555-0104",
        bio: "Boutique hotel manager with a passion for exceptional guest experiences.",
        isVerified: true,
    },
    {
        googleId: "host005",
        email: "david.wilson@gmail.com",
        name: "David Wilson",
        avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
        role: "host",
        phone: "+1-555-0105",
        bio: "Tech entrepreneur with unique properties in prime locations.",
        isVerified: true,
    },
    // Renters
    {
        googleId: "renter001",
        email: "alex.taylor@gmail.com",
        name: "Alex Taylor",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
        role: "renter",
        phone: "+1-555-0201",
        bio: "Digital nomad always looking for inspiring places to work from.",
        isVerified: true,
    },
    {
        googleId: "renter002",
        email: "lisa.anderson@gmail.com",
        name: "Lisa Anderson",
        avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face",
        role: "renter",
        phone: "+1-555-0202",
        bio: "Travel blogger exploring unique accommodations around the world.",
        isVerified: true,
    },
    {
        googleId: "renter003",
        email: "james.martinez@gmail.com",
        name: "James Martinez",
        avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face",
        role: "renter",
        phone: "+1-555-0203",
        bio: "Business traveler who appreciates comfortable and convenient stays.",
        isVerified: true,
    },
    {
        googleId: "renter004",
        email: "maria.garcia@gmail.com",
        name: "Maria Garcia",
        avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face",
        role: "renter",
        phone: "+1-555-0204",
        bio: "Family vacation planner looking for spacious and family-friendly accommodations.",
        isVerified: true,
    },
    {
        googleId: "renter005",
        email: "robert.lee@gmail.com",
        name: "Robert Lee",
        avatar: "https://images.unsplash.com/photo-1519244703995-f4e0f30006d5?w=150&h=150&fit=crop&crop=face",
        role: "renter",
        phone: "+1-555-0205",
        bio: "Photographer seeking photogenic locations for shoots and personal projects.",
        isVerified: true,
    },
];

const sampleProperties = [
    {
        title: "Modern Downtown Loft",
        description:
            "Stunning modern loft in the heart of downtown with floor-to-ceiling windows, exposed brick walls, and all modern amenities. Perfect for business travelers and couples seeking a stylish urban experience.",
        pricePerNight: 150,
        location: {
            address: "123 Main Street",
            city: "New York",
            country: "USA",
            coordinates: { lat: 40.7128, lng: -74.006 },
        },
        images: [
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Air Conditioning", "Kitchen", "Workspace", "TV", "Washer", "Elevator"],
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        propertyType: "apartment",
        rules: ["No smoking", "No parties", "Check-in after 3 PM"],
        checkInTime: "15:00",
        checkOutTime: "11:00",
    },
    {
        title: "Cozy Suburban House",
        description:
            "Beautiful family home in quiet suburban neighborhood. Features spacious backyard, modern kitchen, and comfortable living spaces. Great for families and groups seeking a peaceful retreat.",
        pricePerNight: 200,
        location: {
            address: "456 Oak Avenue",
            city: "Los Angeles",
            country: "USA",
            coordinates: { lat: 34.0522, lng: -118.2437 },
        },
        images: [
            "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Kitchen", "Parking", "Garden", "BBQ", "TV", "Washer", "Dryer"],
        bedrooms: 3,
        bathrooms: 2,
        maxGuests: 6,
        propertyType: "house",
        rules: ["No smoking", "Pets allowed with approval", "Quiet hours after 10 PM"],
        checkInTime: "16:00",
        checkOutTime: "10:00",
    },
    {
        title: "Luxury Beach Villa",
        description:
            "Exclusive beachfront villa with panoramic ocean views, private beach access, infinity pool, and luxury furnishings. The ultimate getaway for those seeking paradise and privacy.",
        pricePerNight: 500,
        location: {
            address: "789 Ocean Drive",
            city: "Miami",
            country: "USA",
            coordinates: { lat: 25.7617, lng: -80.1918 },
        },
        images: [
            "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Pool", "Beach Access", "Kitchen", "Air Conditioning", "Hot Tub", "BBQ", "Parking"],
        bedrooms: 4,
        bathrooms: 3,
        maxGuests: 8,
        propertyType: "villa",
        rules: ["No smoking", "No parties over 8 people", "Respect neighbors"],
        checkInTime: "15:00",
        checkOutTime: "12:00",
    },
    {
        title: "Historic Brownstone Apartment",
        description:
            "Charming pre-war apartment in historic brownstone building. Features original hardwood floors, high ceilings, and vintage details combined with modern conveniences.",
        pricePerNight: 180,
        location: {
            address: "321 Elm Street",
            city: "Boston",
            country: "USA",
            coordinates: { lat: 42.3601, lng: -71.0589 },
        },
        images: [
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Kitchen", "Workspace", "TV", "Heating", "Washer"],
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        propertyType: "apartment",
        rules: ["No smoking", "Quiet hours after 9 PM", "No shoes on carpets"],
        checkInTime: "14:00",
        checkOutTime: "11:00",
    },
    {
        title: "Mountain Cabin Retreat",
        description:
            "Rustic yet comfortable cabin nestled in the mountains. Perfect for nature lovers seeking peace and tranquility. Features fireplace, hiking trails nearby, and stunning mountain views.",
        pricePerNight: 120,
        location: {
            address: "987 Mountain View Road",
            city: "Denver",
            country: "USA",
            coordinates: { lat: 39.7392, lng: -104.9903 },
        },
        images: [
            "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Fireplace", "Kitchen", "Parking", "Hiking", "Pet Friendly"],
        bedrooms: 2,
        bathrooms: 1,
        maxGuests: 4,
        propertyType: "house",
        rules: ["No smoking indoors", "Pets welcome", "Please clean up after pets"],
        checkInTime: "16:00",
        checkOutTime: "10:00",
    },
    {
        title: "Modern Studio in Tech Hub",
        description:
            "Sleek studio apartment in the heart of the tech district. Perfect for business travelers and digital nomads. Features high-speed internet, ergonomic workspace, and modern amenities.",
        pricePerNight: 100,
        location: {
            address: "555 Tech Boulevard",
            city: "San Francisco",
            country: "USA",
            coordinates: { lat: 37.7749, lng: -122.4194 },
        },
        images: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-603b3fc33ddc?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Workspace", "Kitchen", "Air Conditioning", "TV", "Gym Access"],
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 2,
        propertyType: "studio",
        rules: ["No smoking", "Professional use only", "Quiet hours after 10 PM"],
        checkInTime: "15:00",
        checkOutTime: "11:00",
    },
    {
        title: "Artistic Loft in Arts District",
        description:
            "Creative space in the heart of the arts district. High ceilings, natural light, and artistic touches throughout. Perfect for artists and creative professionals seeking inspiration.",
        pricePerNight: 130,
        location: {
            address: "777 Gallery Lane",
            city: "Chicago",
            country: "USA",
            coordinates: { lat: 41.8781, lng: -87.6298 },
        },
        images: [
            "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Art Studio", "Kitchen", "High Ceilings", "Natural Light", "Workspace"],
        bedrooms: 1,
        bathrooms: 1,
        maxGuests: 3,
        propertyType: "apartment",
        rules: ["No smoking", "Respect art installations", "Clean up after use"],
        checkInTime: "14:00",
        checkOutTime: "12:00",
    },
    {
        title: "Waterfront Condo",
        description:
            "Luxurious waterfront condominium with spectacular bay views, private balcony, and access to marina. Modern furnishings and top-tier amenities for an unforgettable stay.",
        pricePerNight: 250,
        location: {
            address: "888 Harbor View",
            city: "Seattle",
            country: "USA",
            coordinates: { lat: 47.6062, lng: -122.3321 },
        },
        images: [
            "https://images.unsplash.com/photo-1464146072230-91cabc968266?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&h=600&fit=crop",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
        ],
        amenities: ["WiFi", "Water View", "Balcony", "Kitchen", "Gym", "Concierge", "Parking"],
        bedrooms: 2,
        bathrooms: 2,
        maxGuests: 4,
        propertyType: "condo",
        rules: ["No smoking", "No loud music after 9 PM", "Building policies apply"],
        checkInTime: "15:00",
        checkOutTime: "11:00",
    },
];

const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Database connection error:", error);
        process.exit(1);
    }
};

const clearDatabase = async (): Promise<void> => {
    try {
        await User.deleteMany({});
        await Property.deleteMany({});
        await Booking.deleteMany({});
        console.log("✅ Database cleared");
    } catch (error) {
        console.error("Error clearing database:", error);
        throw error;
    }
};

const seedUsers = async (): Promise<any[]> => {
    try {
        const users = await User.insertMany(sampleUsers);
        console.log(`✅ Created ${users.length} users`);
        return users;
    } catch (error) {
        console.error("Error seeding users:", error);
        throw error;
    }
};

const seedProperties = async (users: any[]): Promise<any[]> => {
    try {
        // Get only hosts for property creation
        const hosts = users.filter((user) => user.role === "host");

        const propertiesWithHosts = sampleProperties.map((property, index) => ({
            ...property,
            hostId: hosts[index % hosts.length]._id,
        }));

        const properties = await Property.insertMany(propertiesWithHosts);
        console.log(`✅ Created ${properties.length} properties`);
        return properties;
    } catch (error) {
        console.error("Error seeding properties:", error);
        throw error;
    }
};

const seedBookings = async (users: any[], properties: any[]): Promise<void> => {
    try {
        const renters = users.filter((user) => user.role === "renter");
        const bookings = [];

        // Create various booking scenarios
        const today = new Date();

        for (let i = 0; i < 15; i++) {
            const property = properties[Math.floor(Math.random() * properties.length)];
            const renter = renters[Math.floor(Math.random() * renters.length)];
            const host = users.find((u) => u._id.toString() === property.hostId.toString());

            // Create bookings with different date ranges and statuses
            const checkInDays = Math.floor(Math.random() * 60) - 30; // -30 to +30 days from today
            const stayDuration = Math.floor(Math.random() * 10) + 1; // 1-10 days

            const checkInDate = new Date(today.getTime() + checkInDays * 24 * 60 * 60 * 1000);
            const checkOutDate = new Date(checkInDate.getTime() + stayDuration * 24 * 60 * 60 * 1000);

            // Determine status based on dates
            let status: "pending" | "confirmed" | "canceled" | "completed";
            let paymentStatus: "pending" | "paid" | "refunded" = "pending";

            if (checkOutDate < today) {
                status = Math.random() > 0.1 ? "completed" : "canceled";
                paymentStatus = status === "completed" ? "paid" : "refunded";
            } else if (checkInDate < today && checkOutDate > today) {
                status = "confirmed";
                paymentStatus = "paid";
            } else {
                const rand = Math.random();
                if (rand > 0.7) status = "confirmed";
                else if (rand > 0.5) status = "pending";
                else status = "canceled";

                if (status === "confirmed") paymentStatus = "paid";
                else if (status === "canceled") paymentStatus = "refunded";
            }

            const numberOfGuests = Math.floor(Math.random() * property.maxGuests) + 1;
            const totalPrice = stayDuration * property.pricePerNight;

            const booking = {
                propertyId: property._id,
                renterId: renter._id,
                hostId: host!._id,
                checkInDate,
                checkOutDate,
                totalPrice,
                numberOfGuests,
                status,
                paymentStatus,
                specialRequests:
                    Math.random() > 0.5
                        ? [
                              "Early check-in requested",
                              "Late check-out needed",
                              "Airport pickup available?",
                              "Local restaurant recommendations please",
                              "Quiet room preferred",
                          ][Math.floor(Math.random() * 5)]
                        : undefined,
                ...(status === "canceled" && {
                    cancellationReason: [
                        "Travel plans changed",
                        "Found alternative accommodation",
                        "Emergency situation",
                        "Budget constraints",
                    ][Math.floor(Math.random() * 4)],
                    canceledAt: new Date(checkInDate.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                    canceledBy: Math.random() > 0.5 ? renter._id : host!._id,
                }),
            };

            bookings.push(booking);
        }

        await Booking.insertMany(bookings);
        console.log(`✅ Created ${bookings.length} bookings`);
    } catch (error) {
        console.error("Error seeding bookings:", error);
        throw error;
    }
};

const seedDatabase = async (): Promise<void> => {
    try {
        console.log("🌱 Starting database seeding...");

        await connectDB();
        await clearDatabase();

        const users = await seedUsers();
        const properties = await seedProperties(users);
        await seedBookings(users, properties);

        console.log("\n🎉 Database seeding completed successfully!");
        console.log(`📊 Summary:`);
        console.log(
            `   Users: ${users.length} (${users.filter((u) => u.role === "host").length} hosts, ${
                users.filter((u) => u.role === "renter").length
            } renters)`
        );
        console.log(`   Properties: ${properties.length}`);
        console.log(`   Bookings: 15 (with various statuses and dates)`);

        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Seeding failed:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run seeding if this file is executed directly
if (require.main === module) {
    seedDatabase();
}

export default seedDatabase;
