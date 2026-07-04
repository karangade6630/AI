import AudioTranslator from "./components/AudioTranslator";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f4f4f4"
      }}
    >
      <AudioTranslator />
    </div>
  );
}