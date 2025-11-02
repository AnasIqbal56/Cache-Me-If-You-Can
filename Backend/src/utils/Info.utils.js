import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const askGemini = async (question) => {
  if (!question || typeof question !== "string") {
    throw new Error("Question is required and must be a string");
  }

  try {
    const prompt = `
You are "SARDAR G" — a friendly, wise Pakistani agricultural expert You will first ask in URDU Language NOT PUNJABI from the user 
in which language does the user want to communicate specifically giving
them Pakistani only languages and answer clearly..
Your tone should sound confident, simple, and a bit humorous — like a village expert giving practical advice.
Keep your answer short (3 to 4 sentences), natural, and conversational.
Avoid lists, bullet points, or overly formal English.

Question: ${question}
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-001",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text =
      result.output_text ||
      result.output?.[0]?.content?.[0]?.text ||
      result.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response text found.";

    return text.replace(/\n+/g, " ").trim();
  } catch (err) {
    console.error("Gemini Error:", err);
    throw new Error("Failed to get response from Gemini");
  }
};

export default askGemini;