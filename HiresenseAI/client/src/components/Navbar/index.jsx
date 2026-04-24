import { useContext } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext.jsx";
import { BsCpuFill } from "react-icons/bs";
import { MdDashboard, MdHistory, MdLogout } from "react-icons/md";
import { FiTarget } from "react-icons/fi";
import { FaUser } from "react-icons/fa";
import "./index.css";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-left">
        <Link to="/" className="navbar-brand">
          <BsCpuFill className="brand-icon" />
          <span className="brand-text">HireSense AI</span>
        </Link>
        <div className="nav-links">
          <Link
            to="/"
            className={`nav-link ${location.pathname === "/" ? "nav-link-active" : ""}`}
          >
            <MdDashboard className="nav-link-icon" />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/insights"
            className={`nav-link ${location.pathname === "/insights" ? "nav-link-active" : ""}`}
          >
            <FiTarget className="nav-link-icon" />
            <span>Insights</span>
          </Link>
          <Link
            to="/history"
            className={`nav-link ${location.pathname === "/history" ? "nav-link-active" : ""}`}
          >
            <MdHistory className="nav-link-icon" />
            <span>History</span>
          </Link>
          <Link
            to="/profile"
            className={`nav-link ${location.pathname === "/profile" ? "nav-link-active" : ""}`}
          >
            <FaUser className="nav-link-icon" />
            <span>Profile</span>
          </Link>
        </div>
      </div>
      <div className="navbar-right">
        {user && (
          <div className="navbar-user-section">
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user.name}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <MdLogout className="logout-icon" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
