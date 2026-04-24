// ============================================
// searchRoutes.js - Semantic Search Routes
// ============================================
// Routes for semantic search, role matching,
// and insights endpoints.
// ============================================

import { Router } from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import {
  searchResume,
  getRoleMatch,
  getSkillGapAnalysis,
  getInsights,
  getSuggestions,
} from "../controllers/searchController.js";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * POST /api/search/resume
 * Semantic search over resume using natural language
 */
router.post("/resume", searchResume);

/**
 * GET /api/search/role-match
 * Get role match analysis for user's resume
 */
router.get("/role-match", getRoleMatch);

/**
 * GET /api/search/skill-gaps
 * Get skill gaps for a specific role
 */
router.get("/skill-gaps", getSkillGapAnalysis);

/**
 * GET /api/search/insights
 * Get comprehensive insights (memory + roles + trends)
 */
router.get("/insights", getInsights);

/**
 * GET /api/search/suggestions
 * Get suggested search queries
 */
router.get("/suggestions", getSuggestions);

export default router;
