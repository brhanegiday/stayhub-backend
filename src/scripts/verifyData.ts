import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User";
import Property from "../models/Property";
import Booking from "../models/Booking";

// Load environment variables
dotenv.config();

const verifyData = async (): Promise<void> => {
    try {
        console.log("🔍 Verifying database data...");

        await mongoose.connect(process.env.MONGODB_URI!);
        console.log("✅ Connected to MongoDB");

        // Count documents
        const userCount = await User.countDocuments();
        const propertyCount = await Property.countDocuments();
        const bookingCount = await Booking.countDocuments();

        console.log("\n📊 Database Counts:");
        console.log(`   Users: ${userCount}`);
        console.log(`   Properties: ${propertyCount}`);
        console.log(`   Bookings: ${bookingCount}`);

        // Get user statistics
        const hostCount = await User.countDocuments({ role: "host" });
        const renterCount = await User.countDocuments({ role: "renter" });
        const verifiedUsers = await User.countDocuments({ isVerified: true });

        console.log("\n👥 User Statistics:");
        console.log(`   Hosts: ${hostCount}`);
        console.log(`   Renters: ${renterCount}`);
        console.log(`   Verified: ${verifiedUsers}`);

        // Get property statistics
        const activeProperties = await Property.countDocuments({ isActive: true });
        const propertyTypes = await Property.aggregate([{ $group: { _id: "$propertyType", count: { $sum: 1 } } }]);

        console.log("\n🏠 Property Statistics:");
        console.log(`   Active Properties: ${activeProperties}`);
        console.log("   Property Types:");
        propertyTypes.forEach((type) => {
            console.log(`     ${type._id}: ${type.count}`);
        });

        // Get booking statistics
        const bookingStatuses = await Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);

        const paymentStatuses = await Booking.aggregate([{ $group: { _id: "$paymentStatus", count: { $sum: 1 } } }]);

        console.log("\n📅 Booking Statistics:");
        console.log("   Booking Statuses:");
        bookingStatuses.forEach((status) => {
            console.log(`     ${status._id}: ${status.count}`);
        });

        console.log("   Payment Statuses:");
        paymentStatuses.forEach((status) => {
            console.log(`     ${status._id}: ${status.count}`);
        });

        // Sample some actual data
        console.log("\n🔍 Sample Data:");

        const sampleUsers = await User.find().limit(3).select("name email role");
        console.log("   Sample Users:");
        sampleUsers.forEach((user) => {
            console.log(`     ${user.name} (${user.email}) - ${user.role}`);
        });

        const sampleProperties = await Property.find()
            .limit(3)
            .select("title city pricePerNight")
            .populate("hostId", "name");
        console.log("\n   Sample Properties:");
        sampleProperties.forEach((property) => {
            console.log(
                `     ${property.title} in ${property.location.city} - $${property.pricePerNight}/night (Host: ${
                    (property as any).hostId?.name || "Unknown"
                })`
            );
        });

        const sampleBookings = await Booking.find()
            .limit(3)
            .select("checkInDate checkOutDate totalPrice status")
            .populate("propertyId", "title")
            .populate("renterId", "name");
        console.log("\n   Sample Bookings:");
        sampleBookings.forEach((booking) => {
            console.log(
                `     ${(booking as any).renterId?.name || "Unknown"} booked ${
                    (booking as any).propertyId?.title || "Unknown"
                } - $${booking.totalPrice} (${booking.status})`
            );
        });

        console.log("\n✅ Data verification completed!");

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error("❌ Data verification failed:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

// Run if executed directly
if (require.main === module) {
    verifyData();
}

export default verifyData;
