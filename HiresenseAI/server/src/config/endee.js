// ============================================
// endee.js - Endee Vector Database Configuration
// ============================================
// Initializes Endee client with a robust mock fallback
// to ensure the app works even without an API key.
// ============================================

import axios from "axios";

/**
 * Endee client - handles all vector operations
 */
class EndeeClient {
  constructor() {
    this.baseURL = process.env.ENDEE_URL || "https://api.endee.io";
    this.apiKey = process.env.ENDEE_API_KEY;
    this.isMock = !this.apiKey || this.apiKey.includes("your_endee_api_key");
    
    console.log("Endee Init: Key Present?", !!this.apiKey, "Mock Mode?", this.isMock);
    
    this.mockStorage = new Map(); // Simple in-memory fallback

    if (this.isMock) {
      console.warn("⚠️ Endee API key missing or invalid. Running in MOCK mode.");
    } else {
      this.client = axios.create({
        baseURL: this.baseURL,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
    }
  }

  async createIndex(indexName, config = {}) {
    if (this.isMock) return { name: indexName, mock: true };
    try {
      const response = await this.client.post("/indexes", {
        name: indexName,
        dimension: config.dimension || 768,
        metric: config.metric || "cosine",
      });
      return response.data;
    } catch (error) {
      if (error.response?.status === 409) return { name: indexName };
      throw error;
    }
  }

  async insertVectors(indexName, vectors) {
    if (this.isMock) {
      if (!this.mockStorage.has(indexName)) this.mockStorage.set(indexName, []);
      const storage = this.mockStorage.get(indexName);
      vectors.forEach(v => storage.push({ ...v, values: v.vector }));
      console.log(`✓ [Mock] Inserted ${vectors.length} vectors into ${indexName}`);
      return { inserted: vectors.length };
    }

    try {
      const response = await this.client.post(`/indexes/${indexName}/vectors`, {
        vectors: vectors.map(v => ({
          id: v.id,
          values: v.vector,
          metadata: v.metadata || {}
        }))
      });
      return response.data;
    } catch (error) {
      console.error("Endee insert error:", error.message);
      throw error;
    }
  }

  async searchVectors(indexName, vector, options = {}) {
    if (this.isMock) {
      const storage = this.mockStorage.get(indexName) || [];
      const userId = options.filter?.userId;
      
      // Basic simulation of semantic search using cosine similarity is complex for a mock,
      // so we'll just filter by userId and return a subset of results.
      let results = storage;
      if (userId) {
        results = storage.filter(v => v.metadata?.userId === userId);
      }
      
      return results.slice(0, options.limit || 5).map(v => ({
        id: v.id,
        score: 0.95, // Dummy score
        metadata: v.metadata
      }));
    }

    try {
      const response = await this.client.post(`/indexes/${indexName}/search`, {
        vector,
        limit: options.limit || 5,
        includeMetadata: true,
        filter: options.filter
      });
      return response.data?.results || [];
    } catch (error) {
      console.error("Endee search error:", error.message);
      return []; // Return empty instead of crashing
    }
  }

  async deleteVectors(indexName, ids) {
    if (this.isMock) {
      const storage = this.mockStorage.get(indexName) || [];
      const filtered = storage.filter(v => !ids.includes(v.id));
      this.mockStorage.set(indexName, filtered);
      return { deleted: ids.length };
    }
    try {
      const response = await this.client.post(`/indexes/${indexName}/delete`, { ids });
      return response.data;
    } catch (error) {
      return { deleted: 0 };
    }
  }
}

let endeeClient = null;

export const getEndeeClient = () => {
  if (!endeeClient) {
    endeeClient = new EndeeClient();
  }
  return endeeClient;
};

export default EndeeClient;
