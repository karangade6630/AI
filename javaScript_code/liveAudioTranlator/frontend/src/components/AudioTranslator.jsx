import { useRef, useState } from "react";

export default function AudioTranslator() {
  const [isRecording, setIsRecording] = useState(false);

  const wsRef = useRef(null);

  const audioContextRef = useRef(null);

  const mediaStreamRef = useRef(null);

  const processorRef = useRef(null);

  const sourceRef = useRef(null);

  const nextPlayTimeRef = useRef(0);

  const startTranslation = async () => {
    try {
    //   wsRef.current = new WebSocket("ws:/sturdy-system-5grx946rp467cpg9g-5000.app.github.dev");
wsRef.current = new WebSocket(
  "wss://sturdy-system-5grx946rp467cpg9g-5000.app.github.dev"
);

      wsRef.current.binaryType = "arraybuffer";

      wsRef.current.onopen = () => {
        console.log("Connected to backend");
      };

      wsRef.current.onclose = () => {
        console.log("Disconnected");
      };

      wsRef.current.onerror = (err) => {
        console.error(err);
      };

      wsRef.current.onmessage = (event) => {
        if (event.data instanceof ArrayBuffer) {
          playReceivedPCM(event.data);
        } else {
          try {
            const data = JSON.parse(event.data);
            console.log(data);
          } catch {}
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      mediaStreamRef.current = stream;

      audioContextRef.current = new (window.AudioContext ||
        window.webkitAudioContext)({
        sampleRate: 16000
      });

      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      processorRef.current =
        audioContextRef.current.createScriptProcessor(
          4096,
          1,
          1
        );

      sourceRef.current.connect(processorRef.current);

      processorRef.current.connect(
        audioContextRef.current.destination
      );

      processorRef.current.onaudioprocess = (event) => {
        const input =
          event.inputBuffer.getChannelData(0);

        const pcm =
          convertFloat32To16BitPCM(input);

        if (
          wsRef.current &&
          wsRef.current.readyState === WebSocket.OPEN
        ) {
          wsRef.current.send(pcm);
        }
      };

      setIsRecording(true);
    } catch (err) {
      console.error(err);
    }
  };

  const stopTranslation = () => {
    setIsRecording(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current
        .getTracks()
        .forEach((track) => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    nextPlayTimeRef.current = 0;
  };

  const convertFloat32To16BitPCM = (float32Array) => {
    const buffer = new ArrayBuffer(
      float32Array.length * 2
    );

    const view = new DataView(buffer);

    for (let i = 0; i < float32Array.length; i++) {
      let sample = Math.max(
        -1,
        Math.min(1, float32Array[i])
      );

      view.setInt16(
        i * 2,
        sample < 0
          ? sample * 0x8000
          : sample * 0x7fff,
        true
      );
    }

    return buffer;
  };

  const playReceivedPCM = (arrayBuffer) => {
    if (!audioContextRef.current) return;

    const sampleRate = 24000;

    const int16 = new Int16Array(arrayBuffer);

    const float32 = new Float32Array(int16.length);

    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer =
      audioContextRef.current.createBuffer(
        1,
        float32.length,
        sampleRate
      );

    audioBuffer
      .getChannelData(0)
      .set(float32);

    const source =
      audioContextRef.current.createBufferSource();

    source.buffer = audioBuffer;

    source.connect(
      audioContextRef.current.destination
    );
        const currentTime = audioContextRef.current.currentTime;

    if (nextPlayTimeRef.current < currentTime) {
      nextPlayTimeRef.current = currentTime;
    }

    source.start(nextPlayTimeRef.current);

    nextPlayTimeRef.current += audioBuffer.duration;
  };

  return (
    <div
      style={{
        padding: "40px",
        textAlign: "center",
        maxWidth: "600px",
        margin: "auto",
        fontFamily: "Arial, sans-serif"
      }}
    >
      <h1>Gemini Live Audio Translator</h1>

      <p>
        Speak into your microphone and receive translated audio in real time.
      </p>

      {!isRecording ? (
        <button
          onClick={startTranslation}
          style={{
            padding: "14px 28px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#2563eb",
            color: "#fff"
          }}
        >
          🎤 Start Translation
        </button>
      ) : (
        <button
          onClick={stopTranslation}
          style={{
            padding: "14px 28px",
            fontSize: "18px",
            cursor: "pointer",
            borderRadius: "8px",
            border: "none",
            backgroundColor: "#dc2626",
            color: "#fff"
          }}
        >
          🛑 Stop Translation
        </button>
      )}

      <div style={{ marginTop: "20px" }}>
        <strong>Status:</strong>{" "}
        {isRecording ? "Listening..." : "Stopped"}
      </div>
    </div>
  );
}