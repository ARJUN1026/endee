import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listModels() {
  try {
    // Try to get models list via REST since listModels() in SDK might be flaky
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();
    if (data.models) {
      console.log("Available models (v1beta):");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("No models found in v1beta response:", JSON.stringify(data));
    }

    const responseV1 = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`);
    const dataV1 = await responseV1.json();
     if (dataV1.models) {
      console.log("Available models (v1):");
      dataV1.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.log("No models found in v1 response:", JSON.stringify(dataV1));
    }
  } catch (err) {
    console.error("Error listing models:", err.message);
  }
}

listModels();
