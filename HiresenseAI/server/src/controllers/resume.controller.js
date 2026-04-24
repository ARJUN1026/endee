import * as resumeService from "../services/resume.service.js";
import {
  indexResumeVectors,
  generateTextEmbeddings,
} from "../services/vectorService.js";
import { getRoleRecommendations } from "../services/matchService.js";

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please select a PDF.",
      });
    }

    const extractedText = await resumeService.parseResumePDF(req.file.buffer);

    // Save resume to MongoDB
    const resume = await resumeService.saveResume(
      req.user._id,
      req.file.originalname,
      extractedText,
    );

    // Async: Index vectors in Endee and calculate role matches
    // Don't block the response, but log errors
    (async () => {
      try {
        // Index resume chunks in Endee
        const vectorResult = await indexResumeVectors(
          req.user._id,
          extractedText,
          { fileName: req.file.originalname },
        );

        // Calculate role matches
        const roleMatches = await getRoleRecommendations(extractedText);

        // Update resume with vector metadata
        await resumeService.updateResumeMetadata(resume._id, {
          vectorIndexed: true,
          vectorChunksCount: vectorResult.chunks,
          vectorIndexedAt: new Date(),
          roleMatches: roleMatches.allMatches,
          topRole: roleMatches.topRole.role,
          topRoleScore: roleMatches.topRole.score,
        });

        console.log("✓ Resume indexed and role matches calculated");
      } catch (error) {
        console.error("Background indexing error:", error.message);
        // Don't fail the request if async indexing fails
      }
    })();

    return res.json({
      success: true,
      data: {
        resumeId: resume._id,
        fileName: resume.fileName,
        preview: extractedText.substring(0, 500),
        text: extractedText,
        message: "Resume uploaded. Analyzing with AI...",
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getResume = async (req, res, next) => {
  try {
    const resume = await resumeService.getUserResume(req.user._id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found. Please upload one.",
      });
    }

    return res.json({
      success: true,
      data: {
        resumeId: resume._id,
        fileName: resume.fileName,
        preview: resume.extractedText.substring(0, 500),
        text: resume.extractedText,
        vectorIndexed: resume.vectorIndexed || false,
        topRole: resume.topRole,
        topRoleScore: resume.topRoleScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resume with role analysis
 * Includes role matches and skill gaps
 */
export const getResumeWithAnalysis = async (req, res, next) => {
  try {
    const resume = await resumeService.getUserResume(req.user._id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "No resume found. Please upload one.",
      });
    }

    // If not yet analyzed, trigger analysis
    if (!resume.vectorIndexed) {
      (async () => {
        try {
          const vectorResult = await indexResumeVectors(
            req.user._id,
            resume.extractedText,
          );
          const roleMatches = await getRoleRecommendations(
            resume.extractedText,
          );

          await resumeService.updateResumeMetadata(resume._id, {
            vectorIndexed: true,
            vectorChunksCount: vectorResult.chunks,
            vectorIndexedAt: new Date(),
            roleMatches: roleMatches.allMatches,
            topRole: roleMatches.topRole.role,
            topRoleScore: roleMatches.topRole.score,
          });
        } catch (error) {
          console.error("Analysis error:", error.message);
        }
      })();
    }

    return res.json({
      success: true,
      data: {
        resumeId: resume._id,
        fileName: resume.fileName,
        text: resume.extractedText,
        vectorIndexed: resume.vectorIndexed || false,
        vectorChunksCount: resume.vectorChunksCount || 0,
        roleMatches: resume.roleMatches || [],
        topRole: resume.topRole,
        topRoleScore: resume.topRoleScore || 0,
      },
    });
  } catch (error) {
    next(error);
  }
};
