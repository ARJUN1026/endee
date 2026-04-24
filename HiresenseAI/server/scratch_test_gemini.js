import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function testGemini() {
  try {
    const model = ai.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" }, { apiVersion: "v1beta" });
    const result = await model.generateContent("Hello, are you there?");
    const response = await result.response;
    console.log("Success:", response.text());
  } catch (err) {
    console.error("Test Failed:", err.message);
  }
}

testGemini();
