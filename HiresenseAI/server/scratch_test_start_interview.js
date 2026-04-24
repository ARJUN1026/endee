import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Mongoose model just to find a user and a resume
import User from "./src/models/User.model.js";
import Resume from "./src/models/Resume.model.js";

async function testStart() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const user = await User.findOne({ email: "test@example.com" }) || await User.findOne();
  const resume = await Resume.findOne({ userId: user._id });
  
  try {
    // We can't easily mock auth middleware with curl, but we can call the service directly
    const { startInterview } = await import("./src/services/interview.service.js");
    
    console.log("Starting interview for user:", user.email);
    const result = await startInterview(
      user._id,
      "Backend Developer",
      resume?.extractedText || "I am a backend dev",
      user.name,
      5
    );
    console.log("Success:", result);
  } catch (err) {
    console.error("Start Interview Failed:", err.message);
    if (err.stack) console.error(err.stack);
  }
  process.exit();
}

testStart();
