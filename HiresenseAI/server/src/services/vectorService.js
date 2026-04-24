// ============================================
// vectorService.js - Vector Operations & Embeddings
// ============================================
// Handles:
// - Text chunking strategies
// - Embedding generation
// - Vector indexing in Endee
// - Semantic search
// ============================================

import { getEndeeClient } from "../config/endee.js";
import { generateEmbeddings } from "./gemini.service.js";

const CHUNK_SIZE = 300;
const CHUNK_OVERLAP = 50;

/**
 * Smart chunk splitting with overlaps
 */
export const chunkText = (
  text,
  chunkSize = CHUNK_SIZE,
  overlap = CHUNK_OVERLAP,
) => {
  if (!text || text.trim().length === 0) return [];

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks = [];
  let currentChunk = "";

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    } else {
      currentChunk += sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((c) => c.length > 20);
};

/**
 * Generate embeddings for text
 */
export const generateTextEmbeddings = async (text) => {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    // Using Gemini's embedding capabilities (or external service)
    // For production, use specialized embedding models like sentence-transformers
    const embedding = await generateEmbeddings(text);

    if (!embedding || !Array.isArray(embedding)) {
      throw new Error("Failed to generate embeddings");
    }

    return embedding;
  } catch (error) {
    console.error("Error generating embeddings:", error.message);
    throw error;
  }
};

/**
 * Index resume with semantic chunks
 */
export const indexResumeVectors = async (userId, resumeText, metadata = {}) => {
  try {
    const endee = getEndeeClient();

    // Ensure index exists
    await endee.createIndex("resume_chunks", { dimension: 768 });

    // Split resume into meaningful chunks
    const chunks = chunkText(resumeText);

    if (chunks.length === 0) {
      throw new Error("Could not extract meaningful chunks from resume");
    }

    // Generate embeddings for each chunk
    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await generateTextEmbeddings(chunk);

      vectors.push({
        id: `resume_${userId}_chunk_${i}`,
        vector: embedding,
        metadata: {
          userId,
          type: "resume",
          chunkIndex: i,
          text: chunk,
          createdAt: new Date().toISOString(),
          ...metadata,
        },
      });
    }

    // Insert vectors into Endee
    await endee.insertVectors("resume_chunks", vectors);

    return {
      indexed: true,
      chunks: chunks.length,
      vectorsInserted: vectors.length,
    };
  } catch (error) {
    console.error("Error indexing resume vectors:", error.message);
    throw error;
  }
};

/**
 * Search resume context
 */
export const searchResumeContext = async (userId, queryText, limit = 5) => {
  try {
    const endee = getEndeeClient();

    // Generate embedding for query
    const queryEmbedding = await generateTextEmbeddings(queryText);

    // Search with user filter
    const results = await endee.searchVectors("resume_chunks", queryEmbedding, {
      limit,
      includeMetadata: true,
      filter: { userId },
    });

    return results.map((result) => ({
      id: result.id,
      score: result.score,
      text: result.metadata?.text || "",
      metadata: result.metadata,
    }));
  } catch (error) {
    console.error("Error searching resume context:", error.message);
    throw error;
  }
};

/**
 * Index interview memory (answers, weak topics)
 */
export const indexInterviewMemory = async (
  userId,
  interviewId,
  memoryData = {},
) => {
  try {
    const endee = getEndeeClient();

    // Ensure memory index exists
    await endee.createIndex("interview_memory", { dimension: 768 });

    const { question, answer, weakTopics, score } = memoryData;

    // Create text from interview data
    const memoryText = [
      `Question: ${question || ""}`,
      `Answer: ${answer || ""}`,
      `Topics: ${Array.isArray(weakTopics) ? weakTopics.join(", ") : ""}`,
    ]
      .filter((t) => t.length > 5)
      .join("\n");

    if (memoryText.trim().length === 0) {
      return { indexed: false, reason: "Insufficient data" };
    }

    const embedding = await generateTextEmbeddings(memoryText);

    const vectorId = `memory_${interviewId}_${Date.now()}`;

    await endee.insertVectors("interview_memory", [
      {
        id: vectorId,
        vector: embedding,
        metadata: {
          userId,
          interviewId,
          question,
          answer,
          weakTopics: Array.isArray(weakTopics) ? weakTopics : [],
          score: score || 0,
          type: "interview_memory",
          createdAt: new Date().toISOString(),
        },
      },
    ]);

    return { indexed: true, vectorId };
  } catch (error) {
    console.error("Error indexing interview memory:", error.message);
    throw error;
  }
};

/**
 * Retrieve weak topics for user
 */
export const retrieveWeakTopics = async (userId, limit = 5) => {
  try {
    const endee = getEndeeClient();

    // Search for entries with low scores
    const results = await endee.searchVectors(
      "interview_memory",
      new Array(768).fill(0.5), // generic query
      {
        limit: limit * 3,
        includeMetadata: true,
        filter: { userId },
      },
    );

    const weakTopics = results
      .filter((r) => r.metadata?.score < 70)
      .map((r) => ({
        topic: r.metadata?.question || "",
        score: r.metadata?.score || 0,
        weakAreas: r.metadata?.weakTopics || [],
      }));

    return weakTopics.slice(0, limit);
  } catch (error) {
    console.error("Error retrieving weak topics:", error.message);
    return [];
  }
};

/**
 * Delete user vectors on account deletion
 */
export const deleteUserVectors = async (userId) => {
  try {
    const endee = getEndeeClient();

    // Get all user vectors
    const resumeVectors = await endee.searchVectors(
      "resume_chunks",
      new Array(768).fill(0),
      { limit: 1000, filter: { userId } },
    );

    const memoryVectors = await endee.searchVectors(
      "interview_memory",
      new Array(768).fill(0),
      { limit: 1000, filter: { userId } },
    );

    const idsToDelete = [
      ...resumeVectors.map((v) => v.id),
      ...memoryVectors.map((v) => v.id),
    ];

    if (idsToDelete.length > 0) {
      await endee.deleteVectors("resume_chunks", idsToDelete);
      await endee.deleteVectors("interview_memory", idsToDelete);
    }

    return { deleted: idsToDelete.length };
  } catch (error) {
    console.error("Error deleting user vectors:", error.message);
    throw error;
  }
};

export default {
  chunkText,
  generateTextEmbeddings,
  indexResumeVectors,
  searchResumeContext,
  indexInterviewMemory,
  retrieveWeakTopics,
  deleteUserVectors,
};
