import { useState } from "react";
import { getDeviceId } from "../utils/deviceId";

function ProfileSetup({ onComplete }) {
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);

  const submitProfile = async () => {
    setLoading(true);

    const res = await fetch("http://127.0.0.1:8000/profile/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: getDeviceId(),
        nickname,
        bio,
      }),
    });

    const data = await res.json();
    setLoading(false);
    onComplete(data.nickname);
  };

  return (
    <div>
      <h3>Set up your profile</h3>

      <input
        placeholder="Nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />

      <br />

      <textarea
        placeholder="Short bio (1–2 lines)"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
      />

      <br />

      <button onClick={submitProfile} disabled={loading}>
        {loading ? "Saving..." : "Continue"}
      </button>
    </div>
  );
}

export default ProfileSetup;
