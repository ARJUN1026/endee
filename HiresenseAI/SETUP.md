# HireSense AI - Complete Setup & Deployment Guide

## Table of Contents

1. [Local Development Setup](#local-development-setup)
2. [Environment Configuration](#environment-configuration)
3. [Database Setup](#database-setup)
4. [Running Locally](#running-locally)
5. [Testing the Application](#testing-the-application)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Overview](#architecture-overview)

---

## Local Development Setup

### Prerequisites

- **Node.js**: 20.0.0 or higher
  - Verify: `node --version`
- **npm**: 10.0.0 or higher
  - Verify: `npm --version`
- **Git**: For cloning repository
- **MongoDB Atlas**: Cloud database (free tier available)
- **Endee Account**: Vector database (free tier available)
- **Google Gemini API**: For AI generation

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/hiresense-ai.git
cd hiresense-ai
```

### Step 2: Install Dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies (in new terminal)
cd client
npm install
```

### Expected Dependencies

```json
Server:
- express@5.2.1
- mongoose@9.2.4
- @google/genai@1.44.0
- assemblyai@4.8.0
- bcryptjs@3.0.3
- jsonwebtoken@9.0.3
- pdfjs-dist@5.4.624
- multer@1.4.5-lts.2
- cors@2.8.6
- dotenv@17.3.1

Client:
- react@19.0.0
- react-dom@19.0.0
- react-router-dom@7.1.0
- axios@1.7.9
- react-hot-toast@2.5.1
- react-icons@5.6.0
- @monaco-editor/react@4.7.0
- vite@6.0.0
```

---

## Environment Configuration

### Create .env File

```bash
cp .env.example .env
```

### Get API Keys

#### 1. MongoDB Atlas

```
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create new cluster (free tier)
4. Click "Connect" → "Drivers"
5. Copy connection string
6. Add to .env as MONGODB_URI
   Format: mongodb+srv://user:password@cluster.mongodb.net/hiresense?retryWrites=true&w=majority
```

#### 2. Endee Vector Database

```
1. Go to https://endee.io
2. Sign up for free account
3. Create new project
4. Get API Key from dashboard
5. Add to .env:
   - ENDEE_URL=https://api.endee.io
   - ENDEE_API_KEY=your_key_here
```

#### 3. Google Gemini API

```
1. Go to https://aistudio.google.com
2. Click "Get API Key" → "Create API Key"
3. Copy key
4. Add to .env as GEMINI_API_KEY
```

#### 4. JWT Secret

```bash
# Generate random secret
openssl rand -base64 32

# Add to .env as JWT_SECRET
```

### Complete .env File

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/hiresense

# Endee
ENDEE_URL=https://api.endee.io
ENDEE_API_KEY=ek_abc123...

# Gemini
GEMINI_API_KEY=AIzaSyD...

# JWT
JWT_SECRET=abcd1234...=

# CORS
CLIENT_URL=http://localhost:5173

# Optional
MURF_API_KEY=optional_key

# Server
PORT=5000
NODE_ENV=development
```

---

## Database Setup

### MongoDB Collections Auto-Created

```javascript
// Collections created on first user signup:
-users - // User accounts & authentication
  resumes - // Resume uploads & metadata
  interviews; // Interview sessions & feedback
```

### Endee Indexes Auto-Created

```javascript
// Indexes created on first resume upload:
-resume_chunks - // For semantic resume search
  interview_memory; // For weak topic tracking
```

### Manual Initialization (Optional)

```bash
# MongoDB - seed initial roles (optional)
npm run seed

# Endee - validate connection
npm run test:endee
```

---

## Running Locally

### Terminal Setup (2 windows required)

#### Terminal 1: Backend Server

```bash
cd server
npm run dev

# Expected output:
# ✓ MongoDB Connected: ac-cluster.mongodb.net
# ✓ Server running on http://localhost:5000
```

#### Terminal 2: Frontend Dev Server

```bash
cd client
npm run dev

# Expected output:
# ✓ ready in xxx ms
# VITE v6.0.0 ready in XXX ms
# ➜ Local:   http://localhost:5173/
```

### Verify Everything Works

```bash
# Backend health check
curl http://localhost:5000/api/health

# Frontend loads
# Visit http://localhost:5173 in browser
```

---

## Testing the Application

### User Journey Test

#### Test 1: Registration & Login

```bash
1. Open http://localhost:5173
2. Click "Sign Up"
3. Create account:
   - Email: test@example.com
   - Name: Test User
   - Password: Test123!
4. Login with credentials
5. Should see Dashboard
```

#### Test 2: Resume Upload

```bash
1. Click "Upload Resume"
2. Select a PDF file
3. System should:
   ✓ Extract text from PDF
   ✓ Create vector chunks
   ✓ Store in MongoDB + Endee
   ✓ Calculate role matches
   ✓ Show success message
```

#### Test 3: Start Interview

```bash
1. Click "Start Interview"
2. Select "Backend Developer"
3. System should:
   ✓ Retrieve resume context (RAG)
   ✓ Generate personalized questions
   ✓ Play audio greeting
   ✓ Show first question
```

#### Test 4: Answer & Submit

```bash
1. Type answer for first question
2. Click "Submit Answer"
3. System should:
   ✓ Save answer to MongoDB
   ✓ Generate follow-up comment
   ✓ Ask next question
   ✓ Play audio response
```

#### Test 5: Complete Interview

```bash
1. Complete all questions
2. Click "Finish Interview"
3. System should:
   ✓ Generate AI feedback
   ✓ Calculate scores
   ✓ Store in interview memory
   ✓ Show Feedback Page
```

#### Test 6: View Feedback

```bash
1. On Feedback page, should see:
   ✓ Overall score
   ✓ Category breakdowns
   ✓ Weak areas identified
   ✓ Recommendations
```

#### Test 7: Semantic Search (Insights)

```bash
1. Click "Insights" in navbar
2. Click "Semantic Search" tab
3. Enter query: "What backend skills do I have?"
4. System should:
   ✓ Search resume vectors in Endee
   ✓ Return matching chunks
   ✓ Show relevance scores
```

#### Test 8: Role Matching

```bash
1. On Insights page
2. Click "Role Match" tab
3. System should:
   ✓ Analyze resume
   ✓ Show all 5 roles with scores
   ✓ List matched keywords
   ✓ Identify skill gaps
```

### API Testing with Curl

#### Test Resume Upload

```bash
# Get auth token first (after login)
TOKEN=$(curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}' \
  | jq '.token')

# Upload resume
curl -X POST http://localhost:5000/api/resume/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@resume.pdf"
```

#### Test Interview Start

```bash
curl -X POST http://localhost:5000/api/interview/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role":"Backend Developer"}'
```

#### Test Semantic Search

```bash
curl -X POST http://localhost:5000/api/search/resume \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"What backend skills do I have?"}'
```

---

## Production Deployment

### Vercel Deployment (Recommended)

#### Step 1: Prepare for Deployment

```bash
# Add build script to server package.json
"scripts": {
  "build": "npm install",
  "start": "node server.js"
}

# Client build already configured
```

#### Step 2: Push to GitHub

```bash
git add .
git commit -m "Production-ready HireSense AI"
git push origin main
```

#### Step 3: Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from root directory
vercel

# Choose options:
# - Project name: hiresense-ai
# - Framework preset: Other
# - Root directory: ./server
# - Build command: npm install
```

#### Step 4: Configure Environment Variables

```bash
# In Vercel Dashboard:
1. Go to Settings → Environment Variables
2. Add all .env variables:
   - MONGODB_URI
   - ENDEE_URL
   - ENDEE_API_KEY
   - GEMINI_API_KEY
   - JWT_SECRET
   - CLIENT_URL=https://your-frontend.vercel.app
```

#### Step 5: Deploy Frontend

```bash
# From client directory
cd client
vercel

# In Vercel Dashboard, update API calls to point to backend URL
# .env or config file:
VITE_API_URL=https://your-backend.vercel.app/api
```

### Alternative: Docker Deployment

#### Dockerfile (Server)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/ .
RUN npm install
CMD ["node", "server.js"]
EXPOSE 5000
```

#### Docker Build & Run

```bash
docker build -t hiresense-ai-server .
docker run -p 5000:5000 --env-file .env hiresense-ai-server
```

### Alternative: Render Deployment

```bash
1. Push to GitHub
2. Go to https://render.com
3. Create new Web Service
4. Connect GitHub repository
5. Set build command: npm install
6. Set start command: node server.js
7. Add environment variables
8. Deploy
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: MongoDB Connection Error

```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**

```bash
# 1. Check MongoDB URI in .env
# 2. Ensure IP whitelist in MongoDB Atlas includes your IP
# 3. Verify credentials
# 4. Check network connectivity: ping mongodb.com
```

#### Issue: Endee API Key Invalid

```
Error: ENDEE_API_KEY is not defined
```

**Solution:**

```bash
# 1. Copy API key correctly from Endee dashboard
# 2. No spaces in .env variable
# 3. Verify ENDEE_URL is correct
# 4. Test with: curl -H "Authorization: Bearer KEY" https://api.endee.io/
```

#### Issue: Gemini API Error

```
Error: Gemini API failed: API key not valid
```

**Solution:**

```bash
# 1. Get key from https://aistudio.google.com
# 2. Enable Generative Language API
# 3. Check quota limits
# 4. Regenerate key if needed
```

#### Issue: PDF Upload Fails

```
Error: Failed to parse PDF
```

**Solution:**

```bash
# 1. Ensure file is valid PDF
# 2. File size < 10MB
# 3. Check server logs for details
# 4. Try with different PDF
```

#### Issue: No Embeddings Generated

```
Error: Embedding generation failed
```

**Solution:**

```
# Currently using hash-based mock embeddings
# For production, use:
# - OpenAI embeddings
# - HuggingFace transformers
# - Sentence-transformers
```

#### Port Already in Use

```
Error: EADDRINUSE: address already in use :::5000
```

**Solution:**

```bash
# Find & kill process on port 5000
lsof -ti :5000 | xargs kill -9

# Or use different port
PORT=5001 npm run dev
```

#### Clear Dependencies Cache

```bash
# If npm install fails
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## Architecture Overview

### File Structure

```
hiresense-ai/
├── server/                          # Node.js Backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.config.js        # MongoDB connection
│   │   │   └── endee.js            # Endee client initialization
│   │   ├── models/
│   │   │   ├── User.model.js
│   │   │   ├── Resume.model.js     # With vector metadata
│   │   │   └── Interview.model.js  # With RAG & memory fields
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── resume.controller.js # Vector indexing
│   │   │   ├── interview.controller.js
│   │   │   └── searchController.js  # Semantic search
│   │   ├── services/
│   │   │   ├── vectorService.js    # Embeddings & Endee
│   │   │   ├── interview.service.js # RAG pipeline
│   │   │   ├── memoryService.js    # Weak topic tracking
│   │   │   ├── matchService.js     # Role matching
│   │   │   └── resume.service.js
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── resume.routes.js
│   │   │   ├── interview.routes.js
│   │   │   ├── search.routes.js    # NEW semantic search
│   │   │   └── index.js            # Route aggregator
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js
│   │   │   └── error.middleware.js
│   │   └── utils/
│   │       ├── jwt.utils.js
│   │       └── prompts.utils.js
│   ├── server.js                   # Entry point
│   ├── package.json
│   └── .env.example
│
├── client/                          # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── HomePage/
│   │   │   ├── InterviewSetupPage/
│   │   │   ├── InterviewPage/
│   │   │   ├── FeedbackPage/
│   │   │   ├── HistoryPage/
│   │   │   └── InsightsPage/       # NEW semantic search UI
│   │   ├── components/
│   │   │   ├── Navbar/            # Updated with Insights link
│   │   │   ├── AudioPlayer/
│   │   │   ├── CodeEditor/
│   │   │   └── [Others...]
│   │   ├── services/
│   │   │   └── api.js             # Axios instance
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx                # Routes updated
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env.example
│
├── README.md                        # Main documentation
├── SETUP.md                        # This file
├── .env.example                    # Environment template
├── vercel.json                     # Vercel configuration
└── .gitignore
```

### Data Flow

```
User Browser
    ↓
React App (http://localhost:5173)
    ├─ Pages & Components
    ├─ Services (api.js with axios)
    └─ Context (AuthContext)
    ↓
Express Backend (http://localhost:5000)
    ├─ Routes → Controllers → Services
    ├─ Middleware (Auth, Error handling)
    └─ Models (Mongoose)
    ↓
    ├─ MongoDB (User, Interview, Resume)
    ├─ Endee (Vectors, Embeddings)
    └─ External APIs (Gemini, Murf)
```

### Request Flow Example (Interview Start)

```
1. Frontend: POST /api/interview/start
   Data: { role, candidateName }
   Headers: { Authorization: Bearer TOKEN }
   ↓
2. Backend: interviewRoutes.js
   Calls: startInterview() controller
   ↓
3. Controller: interviewController.js
   - Validates user
   - Calls service
   ↓
4. Service: interview.service.js
   - Search Endee: searchResumeContext(userId, roleQuery)
   - Inject context into prompt
   - Call Gemini: askGemini(questionsPrompt)
   - Create Interview doc in MongoDB
   ↓
5. Database
   - Resume vectors from Endee
   - New Interview doc to MongoDB
   ↓
6. Response to Frontend
   {
     interviewId,
     greeting,
     questions,
     audio,
     ragEnabled,
     personalizationHint
   }
```

---

## Performance Checklist

- [ ] MongoDB indexes optimized
- [ ] Endee vector search cached
- [ ] Resume embeddings pre-generated
- [ ] Interview questions cached when possible
- [ ] Audio generation async (non-blocking)
- [ ] Frontend lazy-loads pages
- [ ] Images optimized
- [ ] API responses < 200ms

---

## Security Checklist

- [ ] JWT secrets strong (32+ chars)
- [ ] CORS whitelist configured
- [ ] MongoDB credentials never in code
- [ ] API keys in .env (not committed)
- [ ] HTTPS enforced in production
- [ ] Input validation on all APIs
- [ ] Rate limiting implemented
- [ ] SQL/NoSQL injection protected

---

## Next Steps

1. **Complete Setup**
   - [ ] Get all API keys
   - [ ] Configure .env
   - [ ] Test locally

2. **Customize**
   - [ ] Update UI branding
   - [ ] Add custom roles
   - [ ] Customize feedback template

3. **Deploy**
   - [ ] Push to GitHub
   - [ ] Deploy to Vercel/Render
   - [ ] Configure domain
   - [ ] Set up monitoring

4. **Launch**
   - [ ] Share with users
   - [ ] Gather feedback
   - [ ] Iterate based on usage

---

**Ready to launch HireSense AI? 🚀**

For questions, visit: https://github.com/yourusername/hiresense-ai/issues
