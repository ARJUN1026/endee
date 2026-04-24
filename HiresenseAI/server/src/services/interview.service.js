import Interview from "../models/Interview.model.js";
import { askGemini } from "./gemini.service.js";
import { generateAudio } from "./murf.service.js";
import { parseGeminiJSON } from "../utils/prompts.utils.js";
import {
  GENERATE_QUESTIONS_PROMPT,
  INTERVIEW_GREETING_PROMPT,
  FOLLOW_UP_PROMPT,
  FEEDBACK_PROMPT,
  EVALUATE_CODE_PROMPT,
  buildConversationHistory,
} from "../constants/prompts.js";
import { searchResumeContext } from "./vectorService.js";
import { storeInterviewMemory } from "./memoryService.js";

/**
 * Start interview with RAG (Resume context injection)
 */
export const startInterview = async (
  userId,
  role,
  resumeText,
  candidateName,
  totalQuestions = 5,
) => {
  // Step 1: Retrieve relevant resume context using RAG
  let retrievedContext = [];
  let ragEnabled = false;
  try {
    // Search for resume chunks relevant to the role
    const roleQuery = `${role} skills and experience relevant to ${role}`;
    retrievedContext = await searchResumeContext(userId, roleQuery, 3);
    ragEnabled = true;
    console.log(`✓ RAG: Retrieved ${retrievedContext.length} resume chunks`);
  } catch (error) {
    console.warn(
      "RAG retrieval failed, continuing without context:",
      error.message,
    );
  }

  // Step 2: Build context for question generation
  const contextText = retrievedContext.map((r) => r.text).join("\n---\n");

  // Step 3: Generate personalized questions with injected context
  const questionsPrompt = ragEnabled
    ? `${GENERATE_QUESTIONS_PROMPT(role, resumeText, totalQuestions)}\n\nRelevant Resume Context:\n${contextText}`
    : GENERATE_QUESTIONS_PROMPT(role, resumeText, totalQuestions);

  let aiQuestions = [];
  try {
    const questionsResponse = await askGemini(questionsPrompt);
    aiQuestions = parseGeminiJSON(questionsResponse);
  } catch (geminiError) {
    console.warn('Question generation failed, falling back to generic prompts:', geminiError.message);
    // Fallback: generate simple generic questions without AI
    aiQuestions = Array.from({ length: totalQuestions }, (_, i) => ({
      text: `Generic Question ${i + 1}`,
      type: "generic",
      isCodeQuestion: false,
    }));
  }

  const introQuestion = {
    text: "Tell me about yourself — your background, what you're currently working on, and what excites you about this role.",
    type: "behavioral",
    isCodeQuestion: false,
  };
  const questions = [introQuestion, ...aiQuestions];

  // Step 4: Create interview with metadata
  const interview = await Interview.create({
    userId,
    role,
    resumeText,
    resumeContext: retrievedContext.map((r) => ({
      chunk: r.text,
      relevanceScore: r.score,
    })),
    totalQuestions: questions.length,
    currentQuestion: 1,
    questions,
    status: "in_progress",
    usedRAG: ragEnabled,
    resumeChunksUsed: retrievedContext.length,
    personalizationScore: ragEnabled ? 85 : 50, // Higher score when RAG is used
  });

  const greetingPrompt = INTERVIEW_GREETING_PROMPT(role, candidateName);
  let greeting = "Hello! Let's start the interview.";
  try {
    greeting = await askGemini(greetingPrompt);
  } catch (geminiError) {
    console.warn('Greeting generation failed, using default greeting:', geminiError.message);
  }

  interview.messages.push({
    role: "interviewer",
    content: greeting,
    timestamp: new Date(),
  });

  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(greeting);
  } catch (audioError) {
    console.error(
      "Audio generation failed, continuing without audio:",
      audioError.message,
    );
  }

  interview.lastAudio = audioBase64 || "";
  await interview.save();

  return {
    interviewId: interview._id,
    greeting: greeting,
    currentQuestion: 1,
    totalQuestions: questions.length,
    question: introQuestion,
    audio: audioBase64,
    ragEnabled,
    personalizationHint: ragEnabled
      ? "Questions personalized based on your resume"
      : "Starting with standard questions",
  };
};

export const submitAnswer = async (interviewId, userId, answerText) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) throw new Error("Interview not found");
  if (interview.status === "completed")
    throw new Error("Interview already completed");

  interview.messages.push({
    role: "candidate",
    content: answerText,
    timestamp: new Date(),
  });

  const nextQuestionIndex = interview.currentQuestion;
  if (nextQuestionIndex >= interview.questions.length) {
    interview.status = "completed";
    await interview.save();

    const farewellText =
      "Thank you for completing the interview! I really enjoyed our conversation. Let me prepare your detailed feedback report.";
    let farewellAudio = null;
    try {
      farewellAudio = await generateAudio(farewellText);
    } catch (audioError) {
      console.error("Farewell audio failed:", audioError.message);
    }

    return { isComplete: true, message: farewellText, audio: farewellAudio };
  }

  const conversationHistory = buildConversationHistory(interview.messages);
  const nextQuestion = interview.questions[nextQuestionIndex];

  const followUpPrompt = FOLLOW_UP_PROMPT(
    interview.role,
    conversationHistory,
    nextQuestion.text,
  );
  
  let followUpResponse = "That's very interesting. Let's move on to the next question.";
  try {
    followUpResponse = await askGemini(followUpPrompt);
  } catch (geminiError) {
    console.warn('Follow-up generation failed, using fallback:', geminiError.message);
  }

  interview.messages.push({
    role: "interviewer",
    content: followUpResponse,
    timestamp: new Date(),
  });

  interview.currentQuestion += 1;
  await interview.save();

  const spokenText = `${followUpResponse} ... ${nextQuestion.text}`;
  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(spokenText);
  } catch (audioError) {
    console.error(
      "Audio generation failed, continuing without audio:",
      audioError.message,
    );
  }

  interview.lastAudio = audioBase64 || "";
  await interview.save();

  return {
    isComplete: false,
    response: followUpResponse,
    currentQuestion: interview.currentQuestion,
    totalQuestions: interview.totalQuestions,
    question: nextQuestion,
    audio: audioBase64,
  };
};

export const submitCode = async (interviewId, userId, code, language) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }
  if (interview.status === "completed") {
    const error = new Error("Interview already completed");
    error.statusCode = 400;
    throw error;
  }

  const questionIndex = interview.currentQuestion - 1;
  const question = interview.questions[questionIndex];
  const codeType = question.codeType || "write";

  const evalPrompt = EVALUATE_CODE_PROMPT(
    question.text,
    code,
    language,
    codeType,
  );
  
  let evaluation = { score: 70, feedback: "Code submitted successfully.", suggestions: [] };
  try {
    const evalResponse = await askGemini(evalPrompt);
    evaluation = parseGeminiJSON(evalResponse);
  } catch (geminiError) {
    console.warn('Code evaluation failed, using fallback:', geminiError.message);
  }

  interview.codeSubmissions.push({
    questionIndex,
    codeType,
    code,
    language,
    evaluation,
    timestamp: new Date(),
  });

  interview.messages.push({
    role: "candidate",
    content: `[Code ${codeType} in ${language}] Score: ${evaluation.score}/100\n${code}`,
    timestamp: new Date(),
  });

  const nextQuestionIndex = interview.currentQuestion;
  if (nextQuestionIndex >= interview.questions.length) {
    interview.status = "completed";
    await interview.save();

    const farewellText =
      "Thank you for completing the interview! I really enjoyed our conversation. Let me prepare your detailed feedback report.";
    let farewellAudio = null;
    try {
      farewellAudio = await generateAudio(farewellText);
    } catch (audioError) {
      console.error("Farewell audio failed:", audioError.message);
    }

    return { evaluation, isComplete: true, audio: farewellAudio };
  }

  const conversationHistory = buildConversationHistory(interview.messages);
  const nextQuestion = interview.questions[nextQuestionIndex];

  const followUpPrompt = FOLLOW_UP_PROMPT(
    interview.role,
    conversationHistory,
    nextQuestion.text,
  );
  
  let followUpResponse = "Great work on the coding part. Let's continue.";
  try {
    followUpResponse = await askGemini(followUpPrompt);
  } catch (geminiError) {
    console.warn('Follow-up generation failed, using fallback:', geminiError.message);
  }

  interview.messages.push({
    role: "interviewer",
    content: followUpResponse,
    timestamp: new Date(),
  });

  interview.currentQuestion += 1;

  const spokenText = `${followUpResponse} ... ${nextQuestion.text}`;
  let audioBase64 = null;
  try {
    audioBase64 = await generateAudio(spokenText);
  } catch (audioError) {
    console.error("Audio generation failed:", audioError.message);
  }

  interview.lastAudio = audioBase64 || "";
  await interview.save();

  return {
    evaluation,
    isComplete: false,
    response: followUpResponse,
    currentQuestion: interview.currentQuestion,
    totalQuestions: interview.totalQuestions,
    question: nextQuestion,
    audio: audioBase64,
  };
};

/**
 * End interview and generate feedback with memory storage
 */
export const endInterview = async (interviewId, userId) => {
  const interview = await Interview.findOne({ _id: interviewId, userId });
  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }

  if (interview.status === "completed" && interview.feedback) {
    return {
      interviewId: interview._id,
      feedback: interview.feedback,
      overallScore: interview.overallScore,
    };
  }

  const conversationHistory = buildConversationHistory(interview.messages);

  let codeSubmissionsSummary = "";
  if (interview.codeSubmissions.length > 0) {
    codeSubmissionsSummary = interview.codeSubmissions
      .map(
        (sub, i) =>
          `Submission ${i + 1} (${sub.language}):\n${sub.code}\nEvaluation: ${JSON.stringify(sub.evaluation)}`,
      )
      .join("\n\n");
  }

  const feedbackPrompt = FEEDBACK_PROMPT(
    interview.role,
    conversationHistory,
    codeSubmissionsSummary,
  );
  
  let feedback = { 
    overallScore: 70, 
    summary: "Interview completed successfully. AI feedback was unavailable at the moment, but your performance has been recorded.",
    strengths: ["Communication", "Engagement"],
    weakAreas: ["Specific technical details"],
    roleFit: "Strong Match"
  };

  try {
    const feedbackResponse = await askGemini(feedbackPrompt);
    feedback = parseGeminiJSON(feedbackResponse);
  } catch (geminiError) {
    console.warn('Feedback generation failed, using fallback:', geminiError.message);
  }

  interview.feedback = feedback;
  interview.overallScore = feedback.overallScore || 0;
  interview.weakAreasDetected = feedback.weakAreas || [];
  interview.status = "completed";
  await interview.save();

  // Store performance memory for future interviews
  (async () => {
    try {
      const questions = interview.questions.map((q) => q.text).join(" ");
      await storeInterviewMemory(
        userId,
        interview._id,
        interview.currentQuestion,
        questions,
        conversationHistory.substring(0, 500),
        feedback.summary || "",
        interview.overallScore,
      );
      console.log("✓ Interview memory stored");
    } catch (error) {
      console.warn("Memory storage failed:", error.message);
    }
  })();

  return {
    interviewId: interview._id,
    feedback,
    overallScore: interview.overallScore,
    weakAreas: interview.weakAreasDetected,
  };
};

export const getInterviewById = async (interviewId, userId) => {
  const interview = await Interview.findOne({
    _id: interviewId,
    userId,
  }).select("-__v");
  if (!interview) {
    const error = new Error("Interview not found");
    error.statusCode = 404;
    throw error;
  }
  return interview;
};
