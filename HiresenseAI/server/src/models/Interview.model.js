import mongoose from "mongoose";

const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    resumeText: {
      type: String,
      default: "",
    },
    // Resume context from RAG
    resumeContext: {
      type: [
        {
          chunk: String,
          relevanceScore: Number,
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      index: true,
    },
    totalQuestions: {
      type: Number,
      default: 5,
    },
    currentQuestion: {
      type: Number,
      default: 0,
    },
    questions: {
      type: Array,
      default: [],
    },
    messages: {
      type: Array,
      default: [],
    },
    codeSubmissions: {
      type: Array,
      default: [],
    },
    lastAudio: {
      type: String,
      default: "",
    },
    feedback: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    overallScore: {
      type: Number,
      default: null,
    },
    // Memory engine fields
    performanceMemory: {
      type: [
        {
          questionIndex: Number,
          question: String,
          answer: String,
          feedback: String,
          weakTopics: [String],
          score: Number,
          timestamp: Date,
        },
      ],
      default: [],
    },
    weakAreasDetected: {
      type: [String],
      default: [],
      index: true,
    },
    // Personalization fields
    usedRAG: {
      type: Boolean,
      default: false,
    },
    resumeChunksUsed: {
      type: Number,
      default: 0,
    },
    personalizationScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const Interview = mongoose.model("Interview", interviewSchema);

export default Interview;
