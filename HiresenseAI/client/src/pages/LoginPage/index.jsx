import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { register, emailLogin } from "../../services/authService.js";
import {
  BsCpuFill,
  BsEnvelopeFill,
  BsLockFill,
  BsPersonFill,
  BsArrowRightShort,
} from "react-icons/bs";
import { FiCheck } from "react-icons/fi";
import toast from "react-hot-toast";
import "./index.css";

function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await register(name, email, password);
        toast.success("Welcome to HireSense!");
      } else {
        result = await emailLogin(email, password);
        toast.success("Logged in successfully!");
      }

      login(result.token, result.user);
      navigate("/");
    } catch (error) {
      const message = error.response?.data?.message || "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Dynamic Animated Background */}
      <div className="login-bg-glow top-left"></div>
      <div className="login-bg-glow bottom-right"></div>

      <div className="login-content">
        <div className="login-left-side">
          <div className="login-brand animate-fade-in">
            <BsCpuFill className="login-brand-icon" />
            <span className="login-brand-name">HireSense AI</span>
          </div>
          
          <h1 className="login-hero-title animate-fade-in">
            Elevate Your <span className="text-gradient">Career</span> with Semantic Intelligence.
          </h1>
          
          <ul className="login-feature-list animate-fade-in">
            <li>
              <div className="feature-check"><FiCheck /></div>
              <span>RAG-powered personalized interview questions</span>
            </li>
            <li>
              <div className="feature-check"><FiCheck /></div>
              <span>Semantic resume analysis & role matching</span>
            </li>
            <li>
              <div className="feature-check"><FiCheck /></div>
              <span>Real-time AI performance memory tracking</span>
            </li>
          </ul>
        </div>

        <div className="login-right-side animate-fade-in">
          <div className="login-card">
            <div className="login-card-header">
              <h2>{isSignUp ? "Create Account" : "Sign In"}</h2>
              <p>{isSignUp ? "Join thousands of candidates" : "Welcome back to your dashboard"}</p>
            </div>

            <form onSubmit={handleSubmit} className="login-form">
              {isSignUp && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <BsPersonFill className="input-icon" />
                    <input
                      type="text"
                      className="form-input"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <BsEnvelopeFill className="input-icon" />
                  <input
                    type="email"
                    className="form-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <BsLockFill className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? "Processing..." : isSignUp ? "Get Started" : "Sign In"}
                {!loading && <BsArrowRightShort className="btn-arrow" />}
              </button>
            </form>

            <div className="login-card-footer">
              <p>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}
                <button
                  className="switch-btn"
                  onClick={() => setIsSignUp(!isSignUp)}
                >
                  {isSignUp ? "Sign In" : "Register Now"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
