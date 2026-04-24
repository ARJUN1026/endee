import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

async function listModels() {
  try {
    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Since getGenerativeModel doesn't list, we use the REST API manually to be safe, 
    // but the SDK has a way? No, we will just use fetch.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    
    if (data.models) {
      console.log("Available models:");
      data.models.filter(m => m.name.includes('flash') || m.name.includes('embedding')).forEach(m => {
        console.log(`- ${m.name}`);
      });
    } else {
      console.log("No models returned:", data);
    }
  } catch (err) {
    console.error("Error fetching models:", err);
  }
}

listModels();
