// ============================================
// InsightsPage.jsx - Semantic Search & Analysis
// ============================================
// Allows users to search their resume semantically
// and get personalized insights with role matching.
// ============================================

import { useState, useEffect } from "react";
import API from "../../services/api.js";
import toast from "react-hot-toast";
import { FiSearch, FiTrendingUp, FiTarget, FiBarChart2 } from "react-icons/fi";
import "./index.css";

const InsightsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [roleMatches, setRoleMatches] = useState([]);
  const [insights, setInsights] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search"); // search, roles, memory

  // Fetch suggestions on mount
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await API.get("/search/suggestions");
        setSuggestions(res.data.suggestions);
      } catch (error) {
        console.error("Error fetching suggestions:", error);
      }
    };
    fetchSuggestions();
    fetchInsights();
  }, []);

  // Perform the actual search call
  const performSearch = async (queryToSearch) => {
    if (!queryToSearch.trim()) {
      toast.error("Please enter a search query");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/search/resume", {
        query: queryToSearch,
      });

      setSearchResults(res.data.results || []);
      if (res.data.results.length === 0) {
        toast("No matching resume chunks found", { icon: "🔍" });
      } else {
        toast.success(`Found ${res.data.results.length} matches`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || "Search failed");
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSearch = async (e) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  // Fetch role matches
  const fetchRoleMatches = async () => {
    setLoading(true);
    try {
      const res = await API.get("/search/role-match");
      setRoleMatches(res.data.allMatches || []);
      setActiveTab("roles");
    } catch (error) {
      toast.error("Failed to fetch role matches");
    } finally {
      setLoading(false);
    }
  };

  // Fetch insights
  const fetchInsights = async () => {
    try {
      const res = await API.get("/search/insights");
      setInsights(res.data);
    } catch (error) {
      console.error("Insights error:", error);
    }
  };

  // Use suggested query
  const useSuggestion = (query) => {
    setSearchQuery(query);
    performSearch(query);
  };

  return (
    <div className="insights-page">
      <div className="insights-header">
        <h1>HireSense AI Insights</h1>
        <p>
          Discover your strengths, identify gaps, and get personalized guidance
        </p>
      </div>

      {/* Tabs */}
      <div className="insights-tabs">
        <button
          className={`tab ${activeTab === "search" ? "active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <FiSearch /> Semantic Search
        </button>
        <button
          className={`tab ${activeTab === "roles" ? "active" : ""}`}
          onClick={fetchRoleMatches}
        >
          <FiTarget /> Role Match
        </button>
        <button
          className={`tab ${activeTab === "memory" ? "active" : ""}`}
          onClick={() => setActiveTab("memory")}
        >
          <FiTrendingUp /> Performance Memory
        </button>
      </div>

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="insights-section search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search your resume... e.g., 'React projects', 'Leadership experience'"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button type="submit" disabled={loading} className="search-btn">
              {loading ? (
                <div className="btn-spinner"></div>
              ) : (
                <>
                  <FiSearch /> Search
                </>
              )}
            </button>
          </form>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="suggestions">
              <h3>Suggested Queries:</h3>
              <div className="suggestion-grid">
                {suggestions.map((category, idx) => (
                  <div key={idx} className="suggestion-category">
                    <h4>{category.category}</h4>
                    {category.queries.map((q, i) => (
                      <button
                        key={i}
                        className="suggestion-btn"
                        onClick={() => useSuggestion(q)}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="search-results">
              <h3>Results ({searchResults.length})</h3>
              {searchResults.map((result, idx) => (
                <div key={idx} className="result-card">
                  <div className="result-score">
                    {Math.round(result.score * 100)}%
                  </div>
                  <div className="result-content">
                    <p>{result.text}</p>
                    {result.metadata && (
                      <small>Type: {result.metadata.type}</small>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <div className="insights-section roles-section">
          {roleMatches.length > 0 ? (
            <>
              <h3>Role Fit Analysis</h3>
              <div className="role-cards">
                {roleMatches.map((role, idx) => (
                  <div key={idx} className="role-card">
                    <div className="role-header">
                      <h4>{role.role}</h4>
                      <div className="role-score">{role.score}%</div>
                    </div>
                    <div className="role-bar">
                      <div
                        className="role-bar-fill"
                        style={{ width: `${role.score}%` }}
                      ></div>
                    </div>
                    <p className="role-matched">
                      ✓ Matched: {role.matchedKeywords.length} skills
                    </p>
                    {role.missingKeywords.length > 0 && (
                      <p className="role-missing">
                        To improve:{" "}
                        {role.missingKeywords.slice(0, 3).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p>Click the "Role Match" tab to analyze your role fit.</p>
          )}
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === "memory" && insights && (
        <div className="insights-section memory-section">
          <h3>Your Performance Insights</h3>

          {/* Weak Areas */}
          {insights.memory?.weakAreas &&
            insights.memory.weakAreas.length > 0 && (
              <div className="insight-card">
                <h4>Areas to Improve</h4>
                {insights.memory.weakAreas.map((area, idx) => (
                  <div key={idx} className="weak-area-item">
                    <span className="topic">{area.topic}</span>
                    <span className={`priority ${area.priority}`}>
                      {area.priority}
                    </span>
                    <small>{area.frequency} occurrences</small>
                  </div>
                ))}
              </div>
            )}

          {/* Performance Trend */}
          {insights.memory?.performanceTrend && (
            <div className="insight-card">
              <h4>Performance Trend</h4>
              <div className="trend-info">
                <p>
                  <strong>Overall Average:</strong>{" "}
                  {insights.memory.performanceTrend.average}%
                </p>
                <p>
                  <strong>Trend:</strong>{" "}
                  <span
                    className={`trend ${insights.memory.performanceTrend.trend}`}
                  >
                    {insights.memory.performanceTrend.trend.toUpperCase()}
                  </span>
                </p>
                {insights.memory.performanceTrend.improvement !== 0 && (
                  <p>
                    <strong>Change:</strong>{" "}
                    <span
                      className={
                        insights.memory.performanceTrend.improvement > 0
                          ? "positive"
                          : "negative"
                      }
                    >
                      {insights.memory.performanceTrend.improvement > 0
                        ? "+"
                        : ""}
                      {insights.memory.performanceTrend.improvement}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Personalization Hints */}
          {insights.memory?.personalizationHints &&
            insights.memory.personalizationHints.length > 0 && (
              <div className="insight-card">
                <h4>Personalization Tips</h4>
                {insights.memory.personalizationHints.map((hint, idx) => (
                  <div key={idx} className={`hint-item ${hint.type}`}>
                    <p>{hint.message}</p>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default InsightsPage;
