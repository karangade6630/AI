import express from "express";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("Backend Running");
});

const wss = new WebSocketServer({
  server,
});

wss.on("connection", (clientSocket) => {
  console.log("Frontend Connected");

  const geminiSocket = new WebSocket(
    `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`
  );

  geminiSocket.on("open", () => {
    console.log("Connected to Gemini");

 const setup = {
  setup: {
    
    model: "models/gemini-3.5-live-translate-preview",
    generationConfig: {
      responseModalities: ["AUDIO"],
      translationConfig: {
        targetLanguageCode: "hi",
        echoTargetLanguage: false
      }
    }
  }
};

    geminiSocket.send(JSON.stringify(setup));
  });

  clientSocket.on("message", (message) => {
    if (geminiSocket.readyState !== WebSocket.OPEN) return;

    if (Buffer.isBuffer(message)) {
      const payload = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: message.toString("base64")
            }
          ]
        }
      };

      geminiSocket.send(JSON.stringify(payload));
    } else {
      geminiSocket.send(message.toString());
    }
  });

  geminiSocket.on("message", (message) => {
    try {
      //  console.log("Gemini:", message.toString());
      const data = JSON.parse(message.toString());

      if (
        data.serverContent &&
        data.serverContent.modelTurn &&
        data.serverContent.modelTurn.parts
      ) {
        for (const part of data.serverContent.modelTurn.parts) {
          if (
            part.inlineData &&
            part.inlineData.mimeType.startsWith("audio/pcm")
          ) {
            clientSocket.send(
              Buffer.from(part.inlineData.data, "base64")
            );
          }
        }
      }

      if (data.text) {
        clientSocket.send(JSON.stringify(data));
      }
    } catch (err) {
      console.log(err);
    }
  });

  clientSocket.on("close", () => {
    console.log("Frontend Disconnected");
    geminiSocket.close();
  });

geminiSocket.on("close", (code, reason) => {
  console.log("Gemini closed:", code, reason.toString());
});

 
geminiSocket.on("error", (err) => {
  console.error("Gemini error:", err);
});
});