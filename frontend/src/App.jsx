import { useState } from "react";
import CameraCapture from "./components/cameraCapture.jsx";
import { getDeviceId } from "./utils/deviceId.js";

function App() {
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCapture = async (imageBase64) => {
    setLoading(true);

    const response = await fetch("http://127.0.0.1:8000/verify/gender", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_id: getDeviceId(),
        image_base64: imageBase64,
      }),
    });

    const data = await response.json();
    setGender(data.gender);
    setLoading(false);
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Controlled Anonymity Chat</h1>

      {!gender && !loading && (
        <CameraCapture onCapture={handleCapture} />
      )}

      {loading && <p>Verifying...</p>}

      {gender && (
        <h3>
          Gender Verified: <strong>{gender}</strong>
        </h3>
      )}
    </div>
  );
}

export default App;
