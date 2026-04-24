// ============================================
// gemini.service.js - Gemini AI Service Layer
// ============================================
// Re-exports both text generation and embeddings
// so other services can import from one place.
// ============================================

import {
  generateContent,
  generateEmbeddings as _generateEmbeddings,
} from "../config/gemini.config.js";

/**
 * Send a prompt to Gemini and return the text response.
 */
export const askGemini = async (prompt) => {
  try {
    const response = await generateContent(prompt);
    if (!response) {
      throw new Error("Gemini returned an empty response");
    }
    return response;
  } catch (error) {
    console.error("Gemini Service Error:", error.message);
    throw new Error(
      "The AI service is currently unavailable. Please try again later.",
    );
  }
};

/**
 * Generate real semantic embeddings via Gemini text-embedding-004.
 * Returns 768-dimensional float array.
 */
export const generateEmbeddings = async (text) => {
  return _generateEmbeddings(text);
};
