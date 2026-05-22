import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/users.model.js";

dotenv.config();

async function fixAdminPermissions() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const result = await User.updateMany(
            { role: "admin", isAdmin: { $ne: true } },
            { $set: { isAdmin: true } }
        );

        console.log(`Successfully updated ${result.modifiedCount} accounts to have proper Admin permissions.`);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

fixAdminPermissions();
