// import { useEffect, useState } from "react";
// import { getDeviceId } from "./utils/deviceId";

// function App() {
//   const [status, setStatus] = useState("");
//   const [deviceId, setDeviceId] = useState("");

//   useEffect(() => {
//     const id = getDeviceId();
//     setDeviceId(id);

//     fetch("http://127.0.0.1:8000/onboarding/init", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ device_id: id }),
//     })
//       .then((res) => res.json())
//       .then((data) => {
//         setStatus(data.message);
//       })
//       .catch(() => {
//         setStatus("Onboarding failed");
//       });
//   }, []);

//   return (
//     <div style={{ padding: "2rem", fontFamily: "Arial" }}>
//       <h1>Controlled Anonymity Chat</h1>
//       <p><strong>Device ID:</strong> {deviceId}</p>
//       <p><strong>Onboarding status:</strong> {status}</p>
//     </div>
//   );
// }

// export default App;


import { useState } from "react";
import CameraCapture from "./components/cameraCapture.jsx";

function App() {
  const [capturedImage, setCapturedImage] = useState(null);

  return (
    <div style={{ padding: "2rem", fontFamily: "Arial" }}>
      <h1>Controlled Anonymity Chat</h1>

      {!capturedImage ? (
        <CameraCapture onCapture={setCapturedImage} />
      ) : (
        <>
          <h3>Captured Image (Preview)</h3>
          <img
            src={capturedImage}
            alt="captured"
            style={{ width: "300px", borderRadius: "8px" }}
          />
        </>
      )}
    </div>
  );
}

export default App;

