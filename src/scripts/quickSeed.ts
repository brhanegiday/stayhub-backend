import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import Property from "../models/Property";
import Booking from "../models/Booking";

// Load environment variables
dotenv.config();

const quickSeed = async (): Promise<void> => {
    try {
        console.log("🌱 Quick seeding started...");

        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("✅ Connected to MongoDB");

        // Clear existing data
        await User.deleteMany({});
        await Property.deleteMany({});
        await Booking.deleteMany({});
        console.log("✅ Cleared existing data");

        // Create a few users
        const host = await User.create({
            googleId: "quickhost001",
            email: "host@example.com",
            name: "John Host",
            avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
            role: "host",
            phone: "+1-555-0001",
            bio: "Friendly host",
            isVerified: true,
        });

        const renter = await User.create({
            googleId: "quickrenter001",
            email: "renter@example.com",
            name: "Jane Renter",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b64db678?w=150&h=150&fit=crop&crop=face",
            role: "renter",
            phone: "+1-555-0002",
            bio: "Love to travel",
            isVerified: true,
        });

        console.log("✅ Created 2 users");

        // Create a property
        const property = await Property.create({
            title: "Test Property",
            description: "A great place to stay for testing purposes",
            pricePerNight: 100,
            location: {
                address: "123 Test Street",
                city: "Test City",
                country: "Test Country",
                coordinates: { lat: 40.7128, lng: -74.006 },
            },
            images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop"],
            amenities: ["WiFi", "Kitchen", "TV"],
            bedrooms: 2,
            bathrooms: 1,
            maxGuests: 4,
            propertyType: "apartment",
            hostId: host._id,
            rules: ["No smoking", "No parties"],
            checkInTime: "15:00",
            checkOutTime: "11:00",
        });

        console.log("✅ Created 1 property");

        // Create a booking
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 3);

        await Booking.create({
            propertyId: property._id,
            renterId: renter._id,
            hostId: host._id,
            checkInDate: tomorrow,
            checkOutDate: dayAfterTomorrow,
            totalPrice: 200,
            numberOfGuests: 2,
            status: "pending",
            paymentStatus: "pending",
            specialRequests: "Please provide extra towels",
        });

        console.log("✅ Created 1 booking");

        console.log("\n🎉 Quick seeding completed!");
        console.log("📧 Test accounts created:");
        console.log(`   Host: ${host.email} (${host.name})`);
        console.log(`   Renter: ${renter.email} (${renter.name})`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Quick seeding failed:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run if executed directly
if (require.main === module) {
    quickSeed();
}

export default quickSeed;
