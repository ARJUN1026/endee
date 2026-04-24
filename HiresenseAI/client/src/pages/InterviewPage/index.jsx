import { useState, useEffect, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { 
  getInterview, 
  submitTextAnswer, 
  submitVoiceAnswer, 
  submitCode,
  endInterview
} from "../../services/interviewService.js";
import VoiceRecorder from "../../components/VoiceRecorder";
import CodeEditor from "../../components/CodeEditor";
import AudioPlayer from "../../components/AudioPlayer";
import { 
  BsMicFill, 
  BsSendFill, 
  BsCpuFill, 
  BsCodeSlash, 
  BsChatDotsFill,
  BsFillLightningFill,
  BsClockHistory,
  BsArrowRightCircleFill
} from "react-icons/bs";
import { FiClock, FiCheckCircle, FiInfo } from "react-icons/fi";
import toast from "react-hot-toast";
import "./index.css";

function InterviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answering, setAnswering] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [timer, setTimer] = useState(0);
  const [activeTab, setActiveTab] = useState("voice"); // voice, code, chat
  const [currentAudio, setCurrentAudio] = useState(null);
  
  const chatEndRef = useRef(null);

  useEffect(() => {
    const loadInterview = async () => {
      try {
        const data = await getInterview(id);
        setInterview(data);
        if (data.status === "completed") {
          navigate(`/feedback/${id}`);
        }
        
        // Auto-switch tab based on question type
        const currentQ = data.questions[data.currentQuestion - 1];
        if (currentQ?.isCodeQuestion) {
          setActiveTab("code");
        } else {
          setActiveTab("voice");
        }

        // Set initial audio (greeting or last spoken question)
        if (data.lastAudio) {
          setCurrentAudio(data.lastAudio);
        }
      } catch (err) {
        toast.error("Failed to load interview");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    loadInterview();
  }, [id, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [interview?.messages]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(t => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTextSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!textAnswer.trim() || answering) return;

    setAnswering(true);
    try {
      const result = await submitTextAnswer(id, textAnswer);
      setTextAnswer("");
      updateInterviewState(result, textAnswer);
    } catch (err) {
      toast.error(err.message || "Failed to submit answer");
    } finally {
      setAnswering(false);
    }
  };

  const handleVoiceSubmit = async (blob) => {
    setAnswering(true);
    const loadingToast = toast.loading("AI is analyzing your voice...");
    try {
      const result = await submitVoiceAnswer(id, blob);
      toast.dismiss(loadingToast);
      updateInterviewState(result, result.transcribedText);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Voice processing failed. Please try again or type your answer.");
    } finally {
      setAnswering(false);
    }
  };

  const handleCodeSubmit = async (code, language) => {
    setAnswering(true);
    const loadingToast = toast.loading("Evaluating your code...");
    try {
      const result = await submitCode(id, code, language);
      toast.dismiss(loadingToast);
      updateInterviewState(result, `[Code Submission: ${language}] Score: ${result.evaluation?.score}/100`);
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Code evaluation failed. Please try again.");
    } finally {
      setAnswering(false);
    }
  };

  const updateInterviewState = (result, candidateText) => {
    if (result.isComplete) {
      toast.success("Interview completed! Redirecting to feedback...");
      setTimeout(() => navigate(`/feedback/${id}`), 2000);
    } else {
      setInterview(prev => {
        const nextQ = prev.questions[result.currentQuestion - 1];
        if (nextQ?.isCodeQuestion) setActiveTab("code");
        else setActiveTab("voice");

        return {
          ...prev,
          currentQuestion: result.currentQuestion,
          messages: [...prev.messages, 
            { role: "candidate", content: candidateText },
            { role: "interviewer", content: result.response }
          ]
        };
      });

      // Update audio to speak the new question/follow-up
      if (result.audio) {
        setCurrentAudio(result.audio);
      }
    }
  };

  const handleEndInterview = async () => {
    if (window.confirm("Are you sure you want to end the interview early?")) {
      setAnswering(true);
      try {
        await endInterview(id);
        navigate(`/feedback/${id}`);
      } catch (err) {
        toast.error("Failed to end interview");
        setAnswering(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="interview-page">
        <div className="home-loading-state">
          <div className="spinner"></div>
          <p>Syncing with HireSense AI Brain...</p>
        </div>
      </div>
    );
  }

  const currentQuestionObj = interview.questions[interview.currentQuestion - 1];
  const progress = (interview.currentQuestion / interview.totalQuestions) * 100;

  return (
    <div className="interview-page">
      <div className="interview-progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>

      <AudioPlayer 
        audioBase64={currentAudio} 
        autoPlay={true} 
        onEnded={() => setCurrentAudio(null)} 
      />

      <div className="interview-content">
        {/* Left Side: Question and Controls */}
        <div className="interview-main">
          <div className="interview-status-bar">
            <div className="status-badge ai-active">
              <span className="pulse-dot"></span>
              HireSense AI Interviewer
            </div>
            <div className="status-timer">
              <BsClockHistory />
              <span>{formatTime(timer)}</span>
            </div>
          </div>

          <div className="question-display animate-fade-in">
            <div className="question-meta">
              <span className="q-number">Question {interview.currentQuestion} / {interview.totalQuestions}</span>
              {interview.usedRAG && (
                <span className="rag-badge"><BsFillLightningFill /> Personalized</span>
              )}
            </div>
            <h1 className="question-text">{currentQuestionObj?.text}</h1>
          </div>

          <div className="interaction-tabs">
            <button 
              className={`int-tab ${activeTab === "voice" ? "active" : ""}`}
              onClick={() => setActiveTab("voice")}
              disabled={currentQuestionObj?.isCodeQuestion && activeTab !== "code"}
            >
              <BsMicFill /> Voice Answer
            </button>
            <button 
              className={`int-tab ${activeTab === "code" ? "active" : ""}`}
              onClick={() => setActiveTab("code")}
            >
              <BsCodeSlash /> Code Solution
            </button>
            <button 
              className={`int-tab ${activeTab === "chat" ? "active" : ""}`}
              onClick={() => setActiveTab("chat")}
            >
              <BsChatDotsFill /> Chat History
            </button>
          </div>

          <div className="tab-content">
            {activeTab === "voice" && (
              <div className="voice-interaction animate-fade-in">
                <VoiceRecorder 
                  onRecordingComplete={handleVoiceSubmit}
                  disabled={answering}
                />
                <div className="interaction-hint">
                  <FiInfo />
                  <p>Click record to answer via voice. Our AI will transcribe and analyze your response.</p>
                </div>
              </div>
            )}

            {activeTab === "code" && (
              <div className="code-interaction animate-fade-in">
                <CodeEditor 
                  onSubmit={handleCodeSubmit}
                  disabled={answering}
                />
              </div>
            )}

            {activeTab === "chat" && (
              <div className="chat-history-container animate-fade-in">
                <div className="chat-history">
                  {interview.messages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.role}`}>
                      <div className="msg-avatar">
                        {msg.role === "interviewer" ? "AI" : user?.name?.charAt(0)}
                      </div>
                      <div className="msg-content">{msg.content}</div>
                    </div>
                  ))}
                  <div ref={chatEndRef}></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quick Actions & Text Input Fallback */}
        <div className="interview-sidebar">
          <div className="sidebar-card text-input-card">
            <h3>Text Input Fallback</h3>
            <p>Prefer typing? You can submit your answer here.</p>
            <form className="text-input-form" onSubmit={handleTextSubmit}>
              <textarea 
                placeholder="Type your detailed answer here..."
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={answering}
              />
              <button type="submit" disabled={answering || !textAnswer.trim()}>
                {answering ? "AI Processing..." : "Submit Text Answer"}
                <BsArrowRightCircleFill />
              </button>
            </form>
          </div>

          <div className="sidebar-card help-card">
            <h3>Interview Context</h3>
            <div className="context-item">
              <span className="label">Target Role</span>
              <span className="value">{interview.role}</span>
            </div>
            <div className="context-item">
              <span className="label">Mode</span>
              <span className="value">Semantic Adaptive</span>
            </div>
          </div>

          <button className="end-interview-btn" onClick={handleEndInterview} disabled={answering}>
            End Interview Session
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterviewPage;
