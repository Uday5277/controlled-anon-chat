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
  const [status, setStatus] = useState("");
  const [preference, setPreference] = useState("any");

  const findMatch = async () => {
    const res = await fetch("http://127.0.0.1:8000/match/find", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: getDeviceId(),
        preference,
      }),
    });

    const data = await res.json();
    setStatus(JSON.stringify(data));
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Matchmaking Test</h1>

      <select onChange={(e) => setPreference(e.target.value)}>
        <option value="any">Any</option>
        <option value="male">Male</option>
        <option value="female">Female</option>
      </select>

      <br /><br />

      <button onClick={findMatch}>Find Match</button>

      <p>{status}</p>
    </div>
  );
}

export default App;
