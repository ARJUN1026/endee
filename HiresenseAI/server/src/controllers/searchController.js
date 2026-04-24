// ============================================
// searchController.js - Semantic Search Controller
// ============================================
// Handles semantic search and role matching
// endpoints for the frontend.
// ============================================

import {
  searchResumeContext,
  generateTextEmbeddings,
} from "../services/vectorService.js";
import {
  getRoleRecommendations,
  getSkillGaps,
  calculateRoleMatch,
} from "../services/matchService.js";
import { getUserResume } from "../services/resume.service.js";
import { getMemorySummary } from "../services/memoryService.js";
import Resume from "../models/Resume.model.js";

/**
 * Search resume using semantic queries
 * POST /api/search/resume
 */
export const searchResume = async (req, res) => {
  try {
    const { query } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: "Query cannot be empty" });
    }

    // Search Endee for relevant resume chunks
    let results = await searchResumeContext(userId, query, 5);

    // FIX: If running in Mock mode and server restarted, the in-memory vectors are gone.
    // Let's lazily re-index the resume from MongoDB so the search works!
    if (results.length === 0) {
      const resume = await Resume.findOne({ userId });
      if (resume && resume.extractedText) {
        const { indexResumeVectors } = await import("../services/vectorService.js");
        await indexResumeVectors(userId, resume.extractedText);
        results = await searchResumeContext(userId, query, 5);
      }
    }

    return res.json({
      success: true,
      query,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Search resume error:", error.message);
    return res.status(500).json({
      error: "Search failed",
      message: error.message,
    });
  }
};

/**
 * Get role match analysis
 * GET /api/search/role-match
 */
export const getRoleMatch = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get user's resume
    const resume = await Resume.findOne({ userId });

    if (!resume || !resume.extractedText) {
      return res.status(404).json({
        error: "Resume not found",
        message: "Please upload a resume first",
      });
    }

    // Calculate role matches
    const recommendations = await getRoleRecommendations(resume.extractedText);

    return res.json({
      success: true,
      topRole: recommendations.topRole,
      allMatches: recommendations.allMatches,
      recommendations: recommendations.recommendations,
    });
  } catch (error) {
    console.error("Role match error:", error.message);
    return res.status(500).json({
      error: "Role match failed",
      message: error.message,
    });
  }
};

/**
 * Get skill gaps for a specific role
 * GET /api/search/skill-gaps?role=Frontend%20Developer
 */
export const getSkillGapAnalysis = async (req, res) => {
  try {
    const { role } = req.query;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!role) {
      return res.status(400).json({ error: "Role parameter is required" });
    }

    // Get user's resume
    const resume = await Resume.findOne({ userId });

    if (!resume || !resume.extractedText) {
      return res.status(404).json({
        error: "Resume not found",
        message: "Please upload a resume first",
      });
    }

    // Get skill gaps
    const gaps = await getSkillGaps(resume.extractedText, role);

    return res.json({
      success: true,
      ...gaps,
    });
  } catch (error) {
    console.error("Skill gap error:", error.message);
    return res.status(500).json({
      error: "Skill gap analysis failed",
      message: error.message,
    });
  }
};

/**
 * Get user insights (memory + role match)
 * GET /api/search/insights
 */
export const getInsights = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get memory summary
    const memory = await getMemorySummary(userId);

    // Get role recommendations
    const resume = await Resume.findOne({ userId });
    let roleData = null;

    if (resume?.extractedText) {
      roleData = await getRoleRecommendations(resume.extractedText);
    }

    return res.json({
      success: true,
      memory,
      roles: roleData,
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Get insights error:", error.message);
    return res.status(500).json({
      error: "Failed to get insights",
      message: error.message,
    });
  }
};

/**
 * Search examples / suggested queries
 * GET /api/search/suggestions
 */
export const getSuggestions = async (req, res) => {
  try {
    const suggestions = [
      {
        category: "Skills",
        queries: [
          "What backend skills do I have?",
          "Which AI/ML tools do I know?",
          "Show my frontend experience",
        ],
      },
      {
        category: "Projects",
        queries: [
          "Which project proves leadership?",
          "What full-stack projects have I done?",
          "My most recent work",
        ],
      },
      {
        category: "Experience",
        queries: [
          "How many years of experience do I have?",
          "What companies have I worked for?",
          "My technical strengths",
        ],
      },
    ];

    return res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Failed to get suggestions",
      message: error.message,
    });
  }
};

export default {
  searchResume,
  getRoleMatch,
  getSkillGapAnalysis,
  getInsights,
  getSuggestions,
};
