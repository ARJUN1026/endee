import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInterview } from "../../services/interviewService.js";
import getScoreColor from "../../constants/scoreColors.js";
import {
  BsCheckCircleFill,
  BsArrowUpRight,
  BsJournalText,
  BsArrowRepeat,
  BsSpeedometer2,
  BsBriefcaseFill,
  BsChatDots,
  BsLightbulb,
  BsCodeSlash,
  BsCpuFill,
} from "react-icons/bs";
import { FiHome, FiZap } from "react-icons/fi";
import toast from "react-hot-toast";
import "./index.css";

// Animated circular score gauge
function ScoreGauge({ score, color, label, icon: Icon }) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = score || 0;
    if (end === 0) return;
    const step = Math.ceil(end / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) {
        setDisplayed(end);
        clearInterval(timer);
      } else {
        setDisplayed(start);
      }
    }, 20);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (circumference * Math.min(displayed, 100)) / 100;

  return (
    <div className="score-gauge-card">
      <div className="score-gauge-svg-wrap">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="10"
          />
          <circle
            cx="55"
            cy="55"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 55 55)"
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />
          <text
            x="55"
            y="53"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize="18"
            fontWeight="700"
          >
            {displayed}
          </text>
          <text
            x="55"
            y="70"
            textAnchor="middle"
            fill="rgba(255,255,255,0.5)"
            fontSize="9"
          >
            /100
          </text>
        </svg>
      </div>
      <div className="score-gauge-meta">
        {Icon && <Icon className="score-gauge-icon" style={{ color }} />}
        <span className="score-gauge-label">{label}</span>
      </div>
    </div>
  );
}

// Category score bar
function ScoreBar({ label, score, comment, icon: Icon }) {
  const [width, setWidth] = useState(0);
  const color =
    score >= 80
      ? "#10b981"
      : score >= 60
        ? "#f59e0b"
        : score >= 40
          ? "#f97316"
          : "#ef4444";

  useEffect(() => {
    const t = setTimeout(() => setWidth(score || 0), 100);
    return () => clearTimeout(t);
  }, [score]);

  return (
    <div className="fb-score-bar-item">
      <div className="fb-score-bar-header">
        <div className="fb-score-bar-label">
          {Icon && <Icon className="fb-score-bar-icon" style={{ color }} />}
          <span>{label}</span>
        </div>
        <span className="fb-score-bar-value" style={{ color }}>
          {score}/100
        </span>
      </div>
      <div className="fb-score-bar-track">
        <div
          className="fb-score-bar-fill"
          style={{
            width: `${width}%`,
            backgroundColor: color,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      {comment && <p className="fb-score-bar-comment">{comment}</p>}
    </div>
  );
}

function FeedbackPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  const [resumeMatchScore, setResumeMatchScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const interviewData = await getInterview(id);
        if (!interviewData.feedback) {
          toast.error("No feedback available for this interview.");
          navigate("/");
          return;
        }
        setInterview(interviewData);

        // Fetch resume to calculate combined role match
        const { getResume } = await import("../../services/interviewService.js");
        const resumeData = await getResume();
        if (resumeData && resumeData.topRoleScore) {
           setResumeMatchScore(resumeData.topRoleScore);
        }
      } catch (error) {
        toast.error("Failed to load feedback data");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="fb-loading">
        <div className="fb-loading-spinner" />
        <p>Generating your AI feedback report...</p>
      </div>
    );
  }

  if (!interview || !interview.feedback) return null;

  const { feedback, role, overallScore, usedRAG, personalizationScore } =
    interview;
  const { categoryScores, strengths, areasOfImprovement, finalAssessment } =
    feedback;

  const overallColor = getScoreColor(overallScore);

  const categories = [
    {
      key: "communicationSkills",
      label: "Communication",
      icon: BsChatDots,
    },
    {
      key: "technicalKnowledge",
      label: "Technical Knowledge",
      icon: BsCpuFill,
    },
    {
      key: "problemSolving",
      label: "Problem Solving",
      icon: BsLightbulb,
    },
    {
      key: "codeQuality",
      label: "Code Quality",
      icon: BsCodeSlash,
    },
    {
      key: "confidence",
      label: "Confidence",
      icon: BsSpeedometer2,
    },
  ];

  return (
    <div className="fb-page">
      {/* Header */}
      <div className="fb-hero">
        <div className="fb-hero-glow" />
        <div className="fb-hero-content">
          <div className="fb-hero-badge">
            <FiZap className="fb-badge-icon" />
            {usedRAG ? "RAG-Personalized Interview" : "Standard Interview"}
          </div>
          <h1 className="fb-hero-title">Interview Feedback Report</h1>
          <p className="fb-hero-role">{role}</p>
          <p className="fb-hero-date">
            {new Date(interview.createdAt).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {usedRAG && personalizationScore > 0 && (
            <div className="fb-rag-badge">
              <BsCpuFill />
              Resume-personalized · Personalization Score: {personalizationScore}
              %
            </div>
          )}
          
          <div className="fb-rag-badge" style={{ marginTop: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <BsBriefcaseFill />
            Combined Role Match: {Math.round((resumeMatchScore * 0.4) + (overallScore * 0.6)) || overallScore}% 
            <span style={{opacity: 0.7, fontSize: '12px', marginLeft: '6px'}}>(40% Resume + 60% Interview)</span>
          </div>
        </div>
      </div>

      <div className="fb-body">
        {/* Overall Score */}
        <div className="fb-overall-card">
          <div
            className="fb-overall-ring"
            style={{ "--score-color": overallColor }}
          >
            <svg width="160" height="160" viewBox="0 0 160 160">
              <circle
                cx="80"
                cy="80"
                r="65"
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="12"
              />
              <circle
                cx="80"
                cy="80"
                r="65"
                fill="none"
                stroke={overallColor}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 65}`}
                strokeDashoffset={`${2 * Math.PI * 65 * (1 - (overallScore || 0) / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
            </svg>
            <div className="fb-overall-score-text">
              <span className="fb-overall-number" style={{ color: overallColor }}>
                {overallScore || 0}
              </span>
              <span className="fb-overall-denom">/100</span>
            </div>
          </div>
          <div className="fb-overall-meta">
            <h2>Overall Performance</h2>
            <p>
              {overallScore >= 80
                ? "🎉 Outstanding performance! You're interview-ready."
                : overallScore >= 65
                  ? "✅ Good performance. A few more practice sessions and you'll nail it."
                  : overallScore >= 50
                    ? "📈 Decent start. Focus on the weak areas below."
                    : "📚 Keep practicing! Review the feedback to improve."}
            </p>
          </div>
        </div>

        {/* Score Gauges Grid */}
        <section className="fb-section">
          <h2 className="fb-section-heading">Category Breakdown</h2>
          {categoryScores && (
            <div className="fb-gauges-grid">
              {categories.map(({ key, label, icon }) => (
                <ScoreGauge
                  key={key}
                  score={categoryScores[key]?.score || 0}
                  color={getScoreColor(categoryScores[key]?.score || 0)}
                  label={label}
                  icon={icon}
                />
              ))}
            </div>
          )}
        </section>

        {/* Detailed Score Bars */}
        <section className="fb-section">
          <h2 className="fb-section-heading">Detailed Analysis</h2>
          <div className="fb-score-bars-card">
            {categoryScores &&
              categories.map(({ key, label, icon }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  score={categoryScores[key]?.score || 0}
                  comment={categoryScores[key]?.comment}
                  icon={icon}
                />
              ))}
          </div>
        </section>

        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <section className="fb-section">
            <div className="fb-callout fb-callout-success">
              <div className="fb-callout-header">
                <BsCheckCircleFill className="fb-callout-icon success" />
                <h2>Strengths</h2>
              </div>
              <ul className="fb-callout-list">
                {strengths.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Areas to Improve */}
        {areasOfImprovement && areasOfImprovement.length > 0 && (
          <section className="fb-section">
            <div className="fb-callout fb-callout-warning">
              <div className="fb-callout-header">
                <BsArrowUpRight className="fb-callout-icon warning" />
                <h2>Areas for Improvement</h2>
              </div>
              <ul className="fb-callout-list">
                {areasOfImprovement.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Final Assessment */}
        {finalAssessment && (
          <section className="fb-section">
            <div className="fb-callout fb-callout-blue">
              <div className="fb-callout-header">
                <BsJournalText className="fb-callout-icon blue" />
                <h2>AI Final Assessment</h2>
              </div>
              <p className="fb-assessment-text">{finalAssessment}</p>
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="fb-actions">
          <button
            className="fb-btn-primary"
            onClick={() => navigate("/setup")}
          >
            <BsArrowRepeat />
            Retake Interview
          </button>
          <button
            className="fb-btn-outline"
            onClick={() => navigate("/insights")}
          >
            <FiZap />
            View Insights
          </button>
          <button className="fb-btn-ghost" onClick={() => navigate("/")}>
            <FiHome />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeedbackPage;
