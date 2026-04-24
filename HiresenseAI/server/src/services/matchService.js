// ============================================
// matchService.js - Role Matching & Scoring Engine
// ============================================
// Analyzes resume and matches against roles
// using semantic similarity.
// ============================================

import { generateEmbeddings, askGemini } from "./gemini.service.js";
import { generateTextEmbeddings } from "./vectorService.js";
import { getEndeeClient } from "../config/endee.js";

// Role profiles with key skills
const ROLE_PROFILES = {
  "Frontend Developer": {
    keywords: [
      "React",
      "Vue",
      "Angular",
      "JavaScript",
      "TypeScript",
      "CSS",
      "HTML",
      "Responsive",
      "UI/UX",
      "Redux",
      "State Management",
      "Webpack",
      "Vite",
    ],
    description:
      "Builds user interfaces and client-side applications with modern web frameworks",
  },
  "Backend Developer": {
    keywords: [
      "Node.js",
      "Python",
      "Java",
      "Go",
      "Database",
      "API",
      "REST",
      "SQL",
      "MongoDB",
      "Authentication",
      "Scaling",
      "DevOps",
      "Linux",
    ],
    description:
      "Develops server-side logic, databases, and APIs for applications",
  },
  "Full Stack Developer": {
    keywords: [
      "React",
      "Node.js",
      "MongoDB",
      "PostgreSQL",
      "Docker",
      "AWS",
      "Full Stack",
      "MERN",
      "MEAN",
      "Database Design",
      "API Development",
    ],
    description:
      "Builds complete applications from frontend to backend with deployment",
  },
  "DevOps Engineer": {
    keywords: [
      "Docker",
      "Kubernetes",
      "AWS",
      "Azure",
      "CI/CD",
      "Jenkins",
      "Linux",
      "Infrastructure",
      "Terraform",
      "Monitoring",
      "Scaling",
    ],
    description:
      "Manages infrastructure, deployment, and operational excellence",
  },
  "AI/ML Engineer": {
    keywords: [
      "Python",
      "Machine Learning",
      "TensorFlow",
      "PyTorch",
      "NLP",
      "Computer Vision",
      "Pandas",
      "NumPy",
      "Deep Learning",
      "Model Training",
      "Data Science",
    ],
    description: "Develops AI and machine learning models and systems",
  },
};

/**
 * Calculate role match score using semantic similarity
 */
export const calculateRoleMatch = async (resumeText) => {
  try {
    const roleMatches = [];

    // Generate embeddings for resume
    const resumeEmbedding = await generateTextEmbeddings(resumeText);

    // For each role, calculate semantic match
    for (const [roleName, roleProfile] of Object.entries(ROLE_PROFILES)) {
      // Keyword-based matching
      const keywordMatches = roleProfile.keywords.filter((keyword) =>
        resumeText.toLowerCase().includes(keyword.toLowerCase()),
      );
      const keywordScore =
        (keywordMatches.length / roleProfile.keywords.length) * 100;

      // Semantic matching using AI
      const semanticPrompt = `
      Resume: ${resumeText.substring(0, 1000)}
      Role: ${roleName}
      Description: ${roleProfile.description}
      
      On a scale of 0-100, how well does this resume match this role?
      Respond with ONLY a number between 0-100, nothing else.
      `;

      let semanticScore = keywordScore;
      try {
        const scoreStr = await askGemini(semanticPrompt);
        const extracted = parseInt(
          scoreStr.trim().match(/\d+/)?.[0] || keywordScore,
        );
        semanticScore = Math.min(100, Math.max(0, extracted));
      } catch (aiError) {
        console.warn("Semantic scoring failed, using keyword-based score");
        semanticScore = keywordScore;
      }

      // Weighted average (60% keyword, 40% semantic)
      const finalScore = Math.round(keywordScore * 0.6 + semanticScore * 0.4);

      roleMatches.push({
        role: roleName,
        score: finalScore,
        matchedKeywords: keywordMatches,
        missingKeywords: roleProfile.keywords.filter(
          (k) => !keywordMatches.includes(k),
        ),
        confidence: Math.min(100, keywordMatches.length * 15),
      });
    }

    // Sort by score
    return roleMatches.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error("Error calculating role match:", error.message);
    throw error;
  }
};

/**
 * Get role recommendations
 */
export const getRoleRecommendations = async (resumeText) => {
  try {
    const matches = await calculateRoleMatch(resumeText);

    // Filter roles with score > 50
    const recommendations = matches.filter((m) => m.score > 50);

    return {
      topRole: matches[0],
      allMatches: matches,
      recommendations,
      timestamp: new Date(),
    };
  } catch (error) {
    console.error("Error getting role recommendations:", error.message);
    throw error;
  }
};

/**
 * Find skill gaps for specific role
 */
export const getSkillGaps = async (resumeText, targetRole) => {
  try {
    const roleProfile = ROLE_PROFILES[targetRole];

    if (!roleProfile) {
      throw new Error(`Unknown role: ${targetRole}`);
    }

    const resumeLower = resumeText.toLowerCase();

    const gaps = {
      missing: roleProfile.keywords.filter(
        (k) => !resumeLower.includes(k.toLowerCase()),
      ),
      present: roleProfile.keywords.filter((k) =>
        resumeLower.includes(k.toLowerCase()),
      ),
    };

    // Prioritize gaps using AI
    const priorityPrompt = `
    Role: ${targetRole}
    Missing Skills: ${gaps.missing.join(", ")}
    
    Which 3 skills should this person prioritize learning?
    Respond with a JSON array like ["skill1", "skill2", "skill3"].
    `;

    let prioritized = gaps.missing.slice(0, 3);
    try {
      const aiResponse = await askGemini(priorityPrompt);
      const parsed = JSON.parse(aiResponse.match(/\[.*?\]/s)?.[0] || "[]");
      if (Array.isArray(parsed)) {
        prioritized = parsed;
      }
    } catch (e) {
      console.warn("Priority extraction failed, using default order");
    }

    return {
      role: targetRole,
      skillsPossessed: gaps.present,
      skillsGap: gaps.missing,
      priorityGaps: prioritized,
      gapPercentage: Math.round(
        (gaps.missing.length / roleProfile.keywords.length) * 100,
      ),
    };
  } catch (error) {
    console.error("Error getting skill gaps:", error.message);
    throw error;
  }
};

/**
 * Store role match in MongoDB for future reference
 */
export const storeRoleMatch = async (userId, resumeText) => {
  try {
    const matches = await calculateRoleMatch(resumeText);

    // This would be stored in a RoleMatch model/collection
    // For now, we'll return the data
    return {
      userId,
      matches,
      storedAt: new Date(),
    };
  } catch (error) {
    console.error("Error storing role match:", error.message);
    throw error;
  }
};

/**
 * Compare two resumes for role fit
 */
export const compareResumesForRole = async (
  resumeText1,
  resumeText2,
  targetRole,
) => {
  try {
    const gaps1 = await getSkillGaps(resumeText1, targetRole);
    const gaps2 = await getSkillGaps(resumeText2, targetRole);

    return {
      resume1: {
        skillsPresent: gaps1.skillsPossessed.length,
        skillsGap: gaps1.skillsGap.length,
        fitPercentage: 100 - gaps1.gapPercentage,
      },
      resume2: {
        skillsPresent: gaps2.skillsPossessed.length,
        skillsGap: gaps2.skillsGap.length,
        fitPercentage: 100 - gaps2.gapPercentage,
      },
      betterFit:
        gaps1.gapPercentage < gaps2.gapPercentage ? "resume1" : "resume2",
    };
  } catch (error) {
    console.error("Error comparing resumes:", error.message);
    throw error;
  }
};

export default {
  calculateRoleMatch,
  getRoleRecommendations,
  getSkillGaps,
  storeRoleMatch,
  compareResumesForRole,
  ROLE_PROFILES,
};
