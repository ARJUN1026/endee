import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../../context/AuthContext.jsx";
import { uploadResume, getResume } from "../../services/interviewService.js";
import { BsCloudUpload, BsFileEarmarkPdf } from "react-icons/bs";
import toast from "react-hot-toast";
import "./index.css";

function ProfilePage() {
  const { user } = useContext(AuthContext);
  const [file, setFile] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const data = await getResume();
        if (data) {
          setResumeData(data);
        }
      } catch (err) {
        // No resume yet
      } finally {
        setFetching(false);
      }
    };
    fetchResume();
  }, []);

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    if (uploadedFile.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }

    setFile(uploadedFile);
    setLoading(true);
    const id = toast.loading("Processing and indexing your resume...");

    try {
      const result = await uploadResume(uploadedFile);
      setResumeData(result);
      toast.success("Resume processed successfully! AI can now use it.", { id });
    } catch (err) {
      toast.error(err.message || "Failed to process resume", { id });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>Your AI Profile</h1>
          <p>Upload your resume to enable personalized interviews and AI role matching.</p>
        </div>

        <div className="profile-card">
          <h2>Resume / CV</h2>
          {fetching ? (
            <div className="profile-loading">
              <div className="spinner"></div>
              <p>Loading profile...</p>
            </div>
          ) : resumeData ? (
            <div className="resume-active">
              <div className="resume-info">
                <BsFileEarmarkPdf className="file-icon" />
                <div className="resume-details">
                  <h3>{resumeData.fileName}</h3>
                  <p>AI Analyzed & Indexed</p>
                </div>
              </div>
              <div className="resume-actions">
                <label className="btn-update">
                  Update Resume
                  <input type="file" onChange={handleFileUpload} hidden accept="application/pdf" />
                </label>
              </div>
            </div>
          ) : (
            <div className="resume-empty">
              <label className="upload-dropzone">
                <input type="file" onChange={handleFileUpload} hidden accept="application/pdf" />
                {loading ? (
                  <div className="upload-loading">
                    <div className="spinner"></div>
                    <p>Analyzing your resume semantically...</p>
                  </div>
                ) : (
                  <>
                    <BsCloudUpload className="upload-icon" />
                    <h3>Upload Resume</h3>
                    <p>Drag and drop your PDF here, or click to browse</p>
                  </>
                )}
              </label>
            </div>
          )}
        </div>

        {resumeData && resumeData.topRole && (
          <div className="profile-card mt-4">
            <h2>AI Highlights</h2>
            <div className="ai-highlights">
              <div className="highlight-item">
                <span className="label">Primary Role Fit</span>
                <span className="value badge">{resumeData.topRole}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
