import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function moderatePost(content: string): Promise<{ isGenuine: boolean; reason: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following post intended for a "Life Lessons" platform. 
      The platform is for sharing genuine, real-life experiences and the lessons learned from them.
      Determine if this post appears to be a genuine life experience/lesson, or if it seems fictional, spam, or irrelevant.
      
      Post content:
      "${content}"
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isGenuine: {
              type: Type.BOOLEAN,
              description: "True if the post seems like a genuine life lesson or real experience, false if it seems fictional, spam, or irrelevant."
            },
            reason: {
              type: Type.STRING,
              description: "A short explanation of why it was classified as genuine or not."
            }
          },
          required: ["isGenuine", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      isGenuine: result.isGenuine ?? true,
      reason: result.reason ?? "Could not determine."
    };
  } catch (error) {
    console.error("Error during AI moderation:", error);
    // Default to true if moderation fails, or handle differently based on strictness
    return { isGenuine: true, reason: "Moderation failed, allowing by default." };
  }
}
