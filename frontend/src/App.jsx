// import { useState } from "react";
// import CameraCapture from "./components/cameraCapture.jsx";
// import ProfileSetup from "./components/ProfileSetup.jsx";
// import { getDeviceId } from "./utils/deviceId.js";

// function App() {
//   const [gender, setGender] = useState("");
//   const [profileDone, setProfileDone] = useState(false);

//   const handleCapture = async (imageBase64) => {
//     const response = await fetch("http://127.0.0.1:8000/verify/gender", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         device_id: getDeviceId(),
//         image_base64: imageBase64,
//       }),
//     });

//     const data = await response.json();
//     setGender(data.gender);
//   };

//   return (
//     <div style={{ padding: "2rem" }}>
//       <h1>Controlled Anonymity Chat</h1>

//       {!gender && <CameraCapture onCapture={handleCapture} />}

//       <h2>Gender: {gender}</h2>

//       {gender && !profileDone && (
//         <ProfileSetup onComplete={() => setProfileDone(true)} />
//       )}

//       {profileDone && <h3>Profile complete. Ready to match!</h3>}
//     </div>
//   );
// }

// export default App;


import { useState } from "react";
import { getDeviceId } from "./utils/deviceId";

function App() {
  const [queueStatus, setQueueStatus] = useState("");

  const joinQueue = async () => {
    await fetch("http://127.0.0.1:8000/queue/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: getDeviceId() }),
    });
    setQueueStatus("Joined queue");
  };

  const leaveQueue = async () => {
    await fetch("http://127.0.0.1:8000/queue/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: getDeviceId() }),
    });
    setQueueStatus("Left queue");
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Queue Test</h1>
      <button onClick={joinQueue}>Join Queue</button>
      <button onClick={leaveQueue}>Leave Queue</button>
      <p>{queueStatus}</p>
    </div>
  );
}

export default App;
