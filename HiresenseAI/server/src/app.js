// ============================================
// app.js - Express Application Setup
// ============================================
// This file configures the Express app with:
//   - CORS (so React frontend can talk to us)
//   - Body parsing (JSON + large payloads)
//   - API routes
//   - Error handling
// ============================================

import express from "express";
import cors from "cors";
import * as path from "path";
import { fileURLToPath } from "url";

// Import all routes (bundled in one index file)
import routes from "./routes/index.js";

// Import the global error handler
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware.js";

// Get the current directory (needed for ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Create the Express App ----
const app = express();

// ============================================
// MIDDLEWARE (runs on every request, in order)
// ============================================

// 1. CORS: Allow our frontend (React) to talk to this backend
//    Without this, browsers will block requests from localhost:5173 → localhost:5000
app.use(
  cors({
    origin: (origin, callback) => {
      console.log('CORS Request - Origin:', origin, 'Allowed:', process.env.CLIENT_URL);
      callback(null, true);
    },
    credentials: true,
  })
);

// 2. Body Parser: Convert incoming JSON requests to JavaScript objects
//    10mb limit to handle large resume text and interview data
app.use(express.json({ limit: "10mb" }));

// 3. Serve static files from the built client (for Vercel deployment)
//    This serves the React frontend built by Vite (dist/ folder)
const clientDistPath = path.join(__dirname, "..", "..", "client", "dist");
console.log("Serving static files from:", clientDistPath);
app.use(express.static(clientDistPath));

// ============================================
// ROUTES
// ============================================

// Note: API routes come first. If none match, static files are served, then SPA fallback

// Mount all API routes under /api
// /api/auth      → authentication routes
// /api/interview → interview routes (start, answer, feedback)
// /api/resume    → resume upload and parsing routes
// /api/history   → interview history routes
app.use("/api", routes);

// ============================================
// SPA FALLBACK (for client-side routing)
// ============================================
// For any non-API route that doesn't match a file in /dist,
// serve index.html so React Router can handle the route client-side.
// This fixes 404s on routes like /interview, /feedback, etc.
app.use((req, res) => {
  const indexPath = path.join(clientDistPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      // If index.html is missing (e.g. during development), just send a message
      res.status(200).send("HireSense AI Backend is running. (Frontend dist not found)");
    }
  });
});

// ============================================
// ERROR HANDLING (must be AFTER routes)
// ============================================

// Handle 404 - Route not found (if above routes don't match)
app.use(notFoundHandler);

// Handle all other errors (500, validation errors, etc.)
app.use(errorHandler);

// Export the app (used in server.js)
export default app;
