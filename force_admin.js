import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./src/models/users.model.js";

dotenv.config();

async function makeAdmin() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        const email = "saurabhkumar.dpg@gmail.com";
        
        const result = await User.findOneAndUpdate(
            { email: email },
            { $set: { isAdmin: true, role: "admin", isverified: true } },
            { new: true }
        );

        if (result) {
            console.log(`User '${email}' is now a full Admin in the database.`);
        } else {
            console.log(`User with email '${email}' not found.`);
        }
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

makeAdmin();
