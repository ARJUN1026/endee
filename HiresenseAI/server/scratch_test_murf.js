import fetch from "node-fetch";
import dotenv from "dotenv";
dotenv.config();

const testMurf = async () => {
  const MURF_BASE_URL = "https://api.murf.ai/v1/speech/generate";
  const payload = {
    text: "Hello, I am your AI interviewer.",
    voiceId: "en-US-natalie",
    model: "FALCON",
    format: "MP3",
  };

  try {
    const response = await fetch(MURF_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.MURF_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Murf Test Result:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Murf Test Failed:", err.message);
  }
};

testMurf();
