import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
import Resume from "./src/models/Resume.model.js";

async function checkResumes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const resumes = await Resume.find({});
  console.log("Resumes found:", resumes.length);
  resumes.forEach(r => {
    console.log(`User: ${r.userId}, Indexed: ${r.vectorIndexed}, Chunks: ${r.vectorChunksCount}`);
  });
  process.exit();
}

checkResumes();
