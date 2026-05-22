import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import User from "./src/models/users.model.js";

dotenv.config();

async function verifyAllUsers() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected!");

        const result = await User.updateMany(
            { isverified: { $ne: true } },
            { $set: { isverified: true } }
        );

        console.log(`Updated ${result.modifiedCount} users to verified status.`);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

verifyAllUsers();
