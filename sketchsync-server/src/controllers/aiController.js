const { GoogleGenAI } = require('@google/genai');
const logger = require('../utils/logger');

// Initialize Gemini SDK
// It automatically picks up GEMINI_API_KEY from process.env if available
const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({}) : null;

// The System Prompt teaches the AI how to respond with actions
const SYSTEM_PROMPT = `
You are the SketchSync AI Assistant, an intelligent helper embedded in a real-time collaborative whiteboard.
Your goal is to answer user questions, help them brainstorm, or perform actions directly on the canvas on their behalf.

You have the ability to execute whiteboard commands by outputting a JSON block wrapped in \`\`\`json ... \`\`\`.
When you want to execute an action, include a JSON block in your response matching this schema:
\`\`\`json
{
  "actions": [
    {
      "type": "DRAW_SHAPE",
      "shape": "circle" | "rect" | "line",
      "color": "#hexcode",
      "startX": number,
      "startY": number,
      "endX": number,
      "endY": number
    },
    { "type": "CLEAR_BOARD" },
    { "type": "ADD_PAGE" },
    { "type": "REMOVE_PAGE" }
  ]
}
\`\`\`

Guidelines for drawing:
- A standard whiteboard page is roughly 1200x800.
- If asked to draw a shape in the center, use startX/startY near 500,400.
- Make shapes appropriately sized (e.g., endX/endY 100-200px away).
- If the user doesn't specify a color, pick a beautiful vibrant color.
- Always be polite and brief. If you perform an action, tell them what you did.
`;

exports.chat = async (req, res, next) => {
  try {
    if (!ai) {
      return res.status(503).json({ 
        success: false, 
        error: { message: 'AI is not configured. Missing GEMINI_API_KEY.' } 
      });
    }

    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ success: false, error: { message: 'Message is required' } });
    }

    logger.info(`AI Chat Request: "${message}"`);

    // We use gemini-2.5-flash as it's the recommended default for fast general text
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    const text = response.text();

    res.json({
      success: true,
      data: {
        reply: text
      }
    });

  } catch (err) {
    logger.error('AI Chat Error:', err.message);
    next(err);
  }
};
