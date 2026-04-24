import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import {
  getHistory,
  deleteHistoryItem,
} from "../../services/historyService.js";
import InterviewCard from "../../components/InterviewCard";
import {
  BsFillLightningFill,
  BsCheckCircleFill,
  BsTrophyFill,
  BsPlayFill,
  BsJournalText,
  BsCpuFill,
} from "react-icons/bs";
import { FiTrendingUp, FiTarget } from "react-icons/fi";
import toast from "react-hot-toast";
import "./index.css";

function HomePage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [recentInterviews, setRecentInterviews] = useState([]);
  const [allInterviews, setAllInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const allData = await getHistory(1, 100);
        setAllInterviews(allData.entries);
        setRecentInterviews(allData.entries.slice(0, 3));
      } catch (error) {
        console.error("Failed to load history:", error.message);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const handleDelete = async (id) => {
    try {
      await deleteHistoryItem(id);
      setAllInterviews((prev) => {
        const updated = prev.filter((item) => item._id !== id);
        setRecentInterviews(updated.slice(0, 3));
        return updated;
      });
      toast.success("Interview deleted");
    } catch (error) {
      toast.error("Failed to delete interview");
    }
  };

  const handleCardClick = (interview) => {
    if (interview.status === "completed") {
      navigate(`/feedback/${interview._id}`);
    } else {
      navigate(`/interview/${interview._id}`);
    }
  };

  const completedCount = allInterviews.filter(
    (i) => i.status === "completed",
  ).length;

  const avgScore =
    allInterviews.length > 0
      ? Math.round(
          allInterviews
            .filter((i) => i.overallScore)
            .reduce((sum, i) => sum + i.overallScore, 0) /
            (allInterviews.filter((i) => i.overallScore).length || 1),
        )
      : 0;

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="home-hero-glow"></div>
        <div className="home-hero-content">
          <div className="home-welcome">
            <h1 className="home-welcome-heading">
              Welcome, <span className="highlight">{user?.name?.split(" ")[0]}</span>
            </h1>
            <p className="home-welcome-subtitle">
              Master your next interview with <span className="brand-accent">HireSense AI</span>. 
              Personalized mock interviews powered by semantic intelligence.
            </p>
          </div>
          
          <div className="home-actions">
            <button className="home-start-btn" onClick={() => navigate("/setup")}>
              <BsPlayFill className="home-start-icon" />
              Start New Interview
            </button>
            <button className="home-insights-btn" onClick={() => navigate("/insights")}>
              <FiTarget className="home-insights-icon" />
              View AI Insights
            </button>
          </div>
        </div>
      </div>

      <div className="home-main-content">
        <div className="home-stats-row">
          <div className="home-stat-card">
            <div className="stat-icon-wrapper blue">
              <BsJournalText />
            </div>
            <div className="stat-info">
              <span className="home-stat-number">{allInterviews.length}</span>
              <span className="home-stat-label">Total Sessions</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="stat-icon-wrapper green">
              <BsCheckCircleFill />
            </div>
            <div className="stat-info">
              <span className="home-stat-number">{completedCount}</span>
              <span className="home-stat-label">Completed</span>
            </div>
          </div>
          <div className="home-stat-card">
            <div className="stat-icon-wrapper purple">
              <BsTrophyFill />
            </div>
            <div className="stat-info">
              <span className="home-stat-number">{avgScore}%</span>
              <span className="home-stat-label">Average Score</span>
            </div>
          </div>
        </div>

        <div className="home-content-sections">
          <div className="home-recent-section">
            <div className="home-section-header">
              <h2 className="home-section-heading">Recent Performance</h2>
              {recentInterviews.length > 0 && (
                <button
                  className="home-view-all-btn"
                  onClick={() => navigate("/history")}
                >
                  View History
                </button>
              )}
            </div>

            {loading ? (
              <div className="home-loading-state">
                <div className="spinner"></div>
                <p>Analyzing history...</p>
              </div>
            ) : recentInterviews.length === 0 ? (
              <div className="home-empty-state">
                <BsCpuFill className="home-empty-icon" />
                <h3>No interview history found</h3>
                <p>Upload your resume and start your first mock interview to get AI-powered insights.</p>
                <button
                  className="home-empty-cta-btn"
                  onClick={() => navigate("/setup")}
                >
                  Get Started
                </button>
              </div>
            ) : (
              <div className="home-interviews-grid">
                {recentInterviews.map((interview) => (
                  <InterviewCard
                    key={interview._id}
                    interview={interview}
                    onClick={() => handleCardClick(interview)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="home-side-panel">
            <div className="panel-card insights-promo">
              <div className="promo-header">
                <BsFillLightningFill className="promo-icon" />
                <h3>AI Insights</h3>
              </div>
              <p>Discover your top role matches and technical skill gaps based on your resume analysis.</p>
              <button onClick={() => navigate("/insights")}>Analyze Resume</button>
            </div>
            
            <div className="panel-card tips-card">
              <h3>Interview Tips</h3>
              <ul className="tips-list">
                <li>
                  <span className="tip-dot"></span>
                  Maintain eye contact with the camera.
                </li>
                <li>
                  <span className="tip-dot"></span>
                  Use the STAR method for behavioral questions.
                </li>
                <li>
                  <span className="tip-dot"></span>
                  Think out loud during coding challenges.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
