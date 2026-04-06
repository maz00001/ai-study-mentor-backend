export default async function handler(req, res) {
  try {
    const { question } = req.body || { question: "Explain Artificial Intelligence simply." };

    const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: question }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "AI could not generate a response.";

    res.status(200).json({ answer });

  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
                                                                                                }
