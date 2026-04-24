import { searchResumeContext } from "./src/services/vectorService.js";
import dotenv from "dotenv";
dotenv.config();

const testSearch = async () => {
  const userId = "66296365f57c505f37759d57"; // Use the test user ID from before
  const query = "React and Node.js skills";

  try {
    const results = await searchResumeContext(userId, query, 5);
    console.log("Search Results:", JSON.stringify(results, null, 2));
  } catch (err) {
    console.error("Search Failed:", err.message);
  }
};

testSearch();
