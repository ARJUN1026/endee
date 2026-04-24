// ============================================
// memoryService.js - AI Memory Engine
// ============================================
// Tracks weak topics, performance trends,
// and personalizes future interviews.
// ============================================

import Interview from "../models/Interview.model.js";
import { indexInterviewMemory, retrieveWeakTopics } from "./vectorService.js";

/**
 * Store interview performance in memory
 */
export const storeInterviewMemory = async (
  userId,
  interviewId,
  questionIndex,
  question,
  answer,
  feedback,
  score,
) => {
  try {
    // Identify weak topics from feedback
    const weakTopics = extractWeakTopics(feedback);

    // Store in Endee vector database
    await indexInterviewMemory(userId, interviewId, {
      question,
      answer,
      weakTopics,
      score,
    });

    // Also store in MongoDB for structured queries
    await Interview.findByIdAndUpdate(
      interviewId,
      {
        $push: {
          performanceMemory: {
            questionIndex,
            question,
            answer,
            feedback,
            weakTopics,
            score,
            timestamp: new Date(),
          },
        },
      },
      { new: true },
    );

    return { stored: true, weakTopics };
  } catch (error) {
    console.error("Error storing interview memory:", error.message);
    throw error;
  }
};

/**
 * Extract weak topics from AI feedback
 */
export const extractWeakTopics = (feedback = "") => {
  const feedbackLower = feedback.toLowerCase();
  const topics = [];

  // Pattern matching for common weak areas
  const patterns = {
    "async/await": ["async", "await", "promise", "asynchronous", "callback"],
    "state management": ["state", "redux", "context", "zustand"],
    hooks: ["hook", "useeffect", "usestate", "usecontext"],
    testing: ["test", "jest", "mock", "spec"],
    performance: ["optimize", "performance", "slow", "lag"],
    security: ["security", "injection", "xss", "authentication"],
    database: ["database", "query", "index", "schema", "mongodb", "sql"],
    "api design": ["api", "rest", "graphql", "endpoint"],
    "code quality": ["refactor", "clean", "duplicate", "complexity"],
    documentation: ["document", "comment", "readme"],
  };

  for (const [topic, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => feedbackLower.includes(kw))) {
      topics.push(topic);
    }
  }

  return topics.length > 0 ? topics : ["general"];
};

/**
 * Get personalized weak areas for user
 */
export const getUserWeakAreas = async (userId) => {
  try {
    const weakTopics = await retrieveWeakTopics(userId, 10);

    // Aggregate and score
    const aggregated = {};
    weakTopics.forEach((item) => {
      item.weakAreas.forEach((area) => {
        aggregated[area] = (aggregated[area] || 0) + 1;
      });
    });

    // Sort by frequency
    const sorted = Object.entries(aggregated)
      .map(([topic, count]) => ({
        topic,
        frequency: count,
        priority: count > 3 ? "high" : count > 1 ? "medium" : "low",
      }))
      .sort((a, b) => b.frequency - a.frequency);

    return sorted;
  } catch (error) {
    console.error("Error getting weak areas:", error.message);
    return [];
  }
};

/**
 * Get performance trend
 */
export const getPerformanceTrend = async (userId) => {
  try {
    // Get last 10 interviews
    const interviews = await Interview.find({ userId })
      .select("overallScore createdAt")
      .sort({ createdAt: -1 })
      .limit(10);

    if (interviews.length === 0) {
      return {
        trend: "new_user",
        average: 0,
        improvement: 0,
        interviews: [],
      };
    }

    const scores = interviews.map((i) => i.overallScore || 0);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Calculate improvement
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.ceil(scores.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.length > 0
        ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length
        : firstAvg;

    const improvement = ((secondAvg - firstAvg) / firstAvg) * 100 || 0;

    return {
      trend:
        improvement > 5
          ? "improving"
          : improvement < -5
            ? "declining"
            : "stable",
      average: Math.round(average),
      improvement: Math.round(improvement),
      interviews: interviews.map((i) => ({
        score: i.overallScore,
        date: i.createdAt,
      })),
    };
  } catch (error) {
    console.error("Error getting performance trend:", error.message);
    return { trend: "error", average: 0, improvement: 0 };
  }
};

/**
 * Generate personalization hints for next interview
 */
export const generatePersonalizationHints = async (userId) => {
  try {
    const weakAreas = await getUserWeakAreas(userId);
    const trend = await getPerformanceTrend(userId);

    const hints = [];

    // Add weak area hints
    weakAreas.slice(0, 3).forEach((area) => {
      hints.push({
        type: "focus_area",
        topic: area.topic,
        priority: area.priority,
        message: `Practice ${area.topic} - it appeared in ${area.frequency} interviews`,
      });
    });

    // Add trend-based hints
    if (trend.trend === "improving") {
      hints.push({
        type: "encouragement",
        message: `Great progress! You've improved by ${trend.improvement}% on average.`,
      });
    } else if (trend.trend === "declining") {
      hints.push({
        type: "warning",
        message: `Your scores are declining. Focus on fundamentals.`,
      });
    }

    return hints;
  } catch (error) {
    console.error("Error generating personalization hints:", error.message);
    return [];
  }
};

/**
 * Get memory summary for user
 */
export const getMemorySummary = async (userId) => {
  try {
    const weakAreas = await getUserWeakAreas(userId);
    const trend = await getPerformanceTrend(userId);
    const hints = await generatePersonalizationHints(userId);

    return {
      weakAreas,
      performanceTrend: trend,
      personalizationHints: hints,
      lastUpdated: new Date(),
    };
  } catch (error) {
    console.error("Error getting memory summary:", error.message);
    return {
      weakAreas: [],
      performanceTrend: { trend: "error" },
      personalizationHints: [],
    };
  }
};

export default {
  storeInterviewMemory,
  extractWeakTopics,
  getUserWeakAreas,
  getPerformanceTrend,
  generatePersonalizationHints,
  getMemorySummary,
};
