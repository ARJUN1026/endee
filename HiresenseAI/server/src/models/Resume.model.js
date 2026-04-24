import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    extractedText: {
      type: String,
      required: true,
    },
    // Vector indexing fields
    vectorIndexed: {
      type: Boolean,
      default: false,
      index: true,
    },
    vectorChunksCount: {
      type: Number,
      default: 0,
    },
    vectorIndexedAt: {
      type: Date,
      default: null,
    },
    // Role matching fields
    roleMatches: {
      type: [
        {
          role: String,
          score: Number,
          matchedKeywords: [String],
        },
      ],
      default: [],
    },
    topRole: {
      type: String,
      default: null,
    },
    topRoleScore: {
      type: Number,
      default: 0,
    },
    // Extracted skills
    extractedSkills: {
      type: [String],
      default: [],
      index: true,
    },
    // PDF metadata
    fileSize: {
      type: Number,
      default: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const Resume = mongoose.model("Resume", resumeSchema);
export default Resume;
