import { useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { uploadResume, getResume, startInterview } from "../../services/interviewService.js";
import { 
  BsCloudUpload, 
  BsFileEarmarkPdf, 
  BsCheckCircleFill,
  BsCodeSlash,
  BsCpuFill,
  BsLayoutTextSidebarReverse,
  BsTerminal,
  BsGearFill
} from "react-icons/bs";
import { FiArrowRight, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import "./index.css";

const ROLES = [
  { id: "Frontend Developer", icon: <BsLayoutTextSidebarReverse /> },
  { id: "Backend Developer", icon: <BsTerminal /> },
  { id: "Full Stack Developer", icon: <BsCpuFill /> },
  { id: "AI Engineer", icon: <BsCpuFill /> },
  { id: "SDE Intern", icon: <BsCodeSlash /> },
];

function InterviewSetupPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [step, setStep] = useState(2); // Start directly at Role Selection
  const [resumeData, setResumeData] = useState(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [fetchingResume, setFetchingResume] = useState(true);

  useEffect(() => {
    const checkResume = async () => {
      try {
        const data = await getResume();
        if (data && data.text) {
          setResumeData(data);
          setSelectedRole(data.topRole || "");
          setStep(2);
        } else {
          // Explicitly no resume
          setResumeData(null);
        }
      } catch (err) {
        setResumeData(null);
      } finally {
        setFetchingResume(false);
      }
    };
    checkResume();
  }, []);

  const handleStart = async () => {
    if (!selectedRole) {
      toast.error("Please select a target role first.");
      return;
    }

    if (!resumeData || !resumeData.text) {
      toast.error("Resume data is missing. Please go to Profile to upload it.");
      return;
    }

    setLoading(true);
    const id = toast.loading("Initializing AI Interviewer...");
    
    try {
      console.log("Starting interview for role:", selectedRole);
      const result = await startInterview(
        selectedRole,
        resumeData.text,
        numQuestions
      );
      
      toast.success("Interview session ready!", { id });
      navigate(`/interview/${result.interviewId}`);
    } catch (err) {
      console.error("Interview start error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to start interview";
      toast.error(msg, { id });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingResume) {
    return (
      <div className="setup-page">
        <div className="home-loading-state">
          <div className="spinner"></div>
          <p>Syncing your profile...</p>
        </div>
      </div>
    );
  }

  if (!resumeData) {
    return (
      <div className="setup-page">
        <div className="setup-container">
          <div className="setup-header">
            <h1>Resume Required</h1>
            <p>Please upload your resume to personalize your interview experience.</p>
          </div>
          <div className="setup-card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BsFileEarmarkPdf style={{ fontSize: '48px', color: '#8b5cf6', marginBottom: '20px' }} />
            <h2>No Resume Found</h2>
            <p style={{ color: '#8d96a0', marginBottom: '30px' }}>You need to upload your resume on your Profile page before starting an interview.</p>
            <button className="btn-next" onClick={() => navigate("/profile")}>
              Go to Profile <FiArrowRight style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="setup-page">
      <div className="setup-container">
        <div className="setup-header">
          <h1>Configure Interview</h1>
          <p>Personalize your mock session based on your profile.</p>
        </div>

        <div className="setup-stepper">
          <div className={`step-item ${step >= 2 ? "active" : ""} ${step > 2 ? "completed" : ""}`}>
            <div className="step-number">{step > 2 ? <BsCheckCircleFill /> : "1"}</div>
            <span>Role</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${step >= 3 ? "active" : ""}`}>
            <div className="step-number">2</div>
            <span>Settings</span>
          </div>
        </div>

        <div className="setup-card">
          {step === 2 && (
            <div className="step-content animate-fade-in">
              <div className="file-info mb-4" style={{ cursor: 'pointer' }} onClick={() => navigate("/profile")}>
                <BsFileEarmarkPdf className="file-icon" />
                <span className="file-name">{resumeData?.fileName}</span>
                <span className="change-btn" style={{ marginLeft: 'auto' }}>Manage in Profile</span>
              </div>

              <h3 className="setup-section-title">Select Target Role</h3>
              <div className="role-grid">
                {ROLES.map((role) => (
                  <div
                    key={role.id}
                    className={`role-option ${selectedRole === role.id ? "selected" : ""}`}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <div className="role-icon-box">{role.icon}</div>
                    <span className="role-name">{role.id}</span>
                    {resumeData?.topRole === role.id && (
                      <span className="match-badge">AI Fit</span>
                    )}
                  </div>
                ))}
              </div>

              <div className="setup-footer">
                <button className="btn-back" onClick={() => setStep(1)}>
                  <FiArrowLeft /> Back
                </button>
                <button 
                  className="btn-next" 
                  onClick={() => setStep(3)}
                  disabled={!selectedRole}
                >
                  Next Step <FiArrowRight />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content animate-fade-in">
              <div className="setup-summary">
                <div className="summary-item">
                  <span className="label">Role</span>
                  <span className="value">{selectedRole}</span>
                </div>
                <div className="summary-item">
                  <span className="label">Context</span>
                  <span className="value success">RAG Enabled</span>
                </div>
              </div>

              <div className="setup-form-group">
                <label className="setup-label">Number of Questions</label>
                <select 
                  className="setup-select"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                >
                  <option value={3}>3 Questions (Quick Start)</option>
                  <option value={5}>5 Questions (Standard)</option>
                  <option value={10}>10 Questions (Comprehensive)</option>
                </select>
              </div>

              <div className="setup-form-group">
                <label className="setup-label">Interview Mode</label>
                <div className="mode-options">
                  <div className="mode-option active">
                    <BsCpuFill />
                    <span>AI Adaptive (RAG)</span>
                  </div>
                </div>
              </div>

              <div className="setup-footer">
                <button className="btn-back" onClick={() => setStep(2)}>
                  <FiArrowLeft /> Back
                </button>
                <button 
                  className="btn-next" 
                  onClick={handleStart}
                  disabled={loading}
                >
                  {loading ? "Initializing..." : "Launch Interview"} <FiArrowRight />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InterviewSetupPage;
