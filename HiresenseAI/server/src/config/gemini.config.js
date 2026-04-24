import { GoogleGenerativeAI } from "@google/generative-ai";

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MODEL_NAME = "gemini-3.1-flash-lite-preview";
const EMBEDDING_MODEL = "text-embedding-004";

/**
 * Generate text content using Gemini 1.5 Flash
 */
const generateContent = async (prompt) => {
  try {
    const model = ai.getGenerativeModel({ model: MODEL_NAME }, { apiVersion: "v1beta" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    throw new Error(`Gemini API failed: ${error.message}`);
  }
};

/**
 * Generate real semantic embeddings using Gemini text-embedding-004.
 * Returns a 768-dimensional float array for use with Endee vector DB.
 */
const generateEmbeddings = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty for embedding");
    }

    const model = ai.getGenerativeModel({ model: EMBEDDING_MODEL }, { apiVersion: "v1beta" });
    const result = await model.embedContent(text.substring(0, 8000));
    const embedding = result.embedding.values;

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Gemini embedding API returned invalid response");
    }

    return embedding; // 768-dimensional vector
  } catch (error) {
    console.error("Embedding generation error:", error.message);
    // Fallback to deterministic hash embedding if API fails
    console.warn("Falling back to hash-based embedding");
    return generateHashEmbedding(text);
  }
};

/**
 * Fallback deterministic 768-dim embedding (dev/offline mode).
 * Used only when the real embedding API is unavailable.
 */
const generateHashEmbedding = (text) => {
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h << 5) - h + str.charCodeAt(i);
      h = h & h;
    }
    return h;
  };

  const baseHash = hash(text);
  return new Array(768).fill(0).map((_, i) => {
    const val = hash(`${text}_${i}`) % 1000;
    return (val / 1000) * (Math.sin(baseHash + i) * 0.5 + 0.5);
  });
};

export { generateContent, generateEmbeddings };
