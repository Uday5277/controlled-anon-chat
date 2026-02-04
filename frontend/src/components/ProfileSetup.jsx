import { useState } from "react";
import { getDeviceId } from "../utils/deviceId";

function ProfileSetup({ onComplete }) {
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submitProfile = async () => {
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("https://controlled-anon-chat.onrender.com/profile/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: getDeviceId(),
          nickname: nickname.trim(),
          bio: bio.trim(),
        }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        setError(data.detail || "Failed to set up profile");
        setLoading(false);
        return;
      }

      setLoading(false);
      onComplete(data.nickname);
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitProfile();
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      animation: "fadeIn 0.5s ease-out"
    }}>
      <div style={{
        textAlign: "center",
        marginBottom: "0.5rem"
      }}>
        <div style={{
          fontSize: "3rem",
          marginBottom: "0.75rem",
          animation: "fadeIn 0.8s ease-out"
        }}>
          ✨
        </div>
        <h3 style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.5rem",
          fontWeight: "700",
          color: "#2d3436"
        }}>
          Create Your Profile
        </h3>
        <p style={{
          margin: 0,
          color: "#636e72",
          fontSize: "0.95rem",
          lineHeight: "1.6"
        }}>
          Let others know a bit about you!
        </p>
      </div>

      {error && (
        <div style={{
          background: "linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)",
          color: "#fff",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(255, 107, 107, 0.3)",
          animation: "slideIn 0.4s ease-out",
          textAlign: "center",
          fontWeight: "500"
        }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{
          fontSize: "0.9rem",
          fontWeight: "600",
          color: "#2d3436",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <span style={{ fontSize: "1.2rem" }}>👤</span>
          Nickname
        </label>
        <input
          type="text"
          placeholder="Enter your nickname..."
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setError("");
          }}
          onKeyPress={handleKeyPress}
          maxLength={20}
          style={{
            width: "100%",
            padding: "0.875rem 1.125rem",
            fontSize: "1rem",
            border: error && !nickname.trim() ? "2px solid #ff6b6b" : "2px solid #e8e8e8",
            borderRadius: "12px",
            background: "#fff",
            color: "#2d3436",
            transition: "all 0.3s ease",
            outline: "none",
            fontWeight: "500"
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = "#667eea";
              e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = error && !nickname.trim() ? "#ff6b6b" : "#e8e8e8";
            e.target.style.boxShadow = "none";
          }}
        />
        <div style={{
          fontSize: "0.8rem",
          color: "#999",
          textAlign: "right"
        }}>
          {nickname.length}/20 characters
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label style={{
          fontSize: "0.9rem",
          fontWeight: "600",
          color: "#2d3436",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem"
        }}>
          <span style={{ fontSize: "1.2rem" }}>📝</span>
          Bio <span style={{ fontSize: "0.8rem", fontWeight: "400", color: "#999" }}>(Optional)</span>
        </label>
        <textarea
          placeholder="Tell us something interesting about yourself..."
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={100}
          rows={3}
          style={{
            width: "100%",
            padding: "0.875rem 1.125rem",
            fontSize: "1rem",
            border: "2px solid #e8e8e8",
            borderRadius: "12px",
            background: "#fff",
            color: "#2d3436",
            resize: "vertical",
            minHeight: "80px",
            maxHeight: "150px",
            transition: "all 0.3s ease",
            outline: "none",
            fontFamily: "inherit",
            lineHeight: "1.6"
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#667eea";
            e.target.style.boxShadow = "0 0 0 4px rgba(102, 126, 234, 0.1)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e8e8e8";
            e.target.style.boxShadow = "none";
          }}
        />
        <div style={{
          fontSize: "0.8rem",
          color: "#999",
          textAlign: "right"
        }}>
          {bio.length}/100 characters
        </div>
      </div>

      <button 
        onClick={submitProfile} 
        disabled={loading || !nickname.trim()}
        style={{
          width: "100%",
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          fontWeight: "700",
          background: loading || !nickname.trim()
            ? "#ddd"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          cursor: loading || !nickname.trim() ? "not-allowed" : "pointer",
          boxShadow: loading || !nickname.trim()
            ? "none"
            : "0 8px 24px rgba(102, 126, 234, 0.4)",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {loading ? (
          <>
            <div style={{
              width: "20px",
              height: "20px",
              border: "3px solid rgba(255, 255, 255, 0.3)",
              borderTop: "3px solid #fff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <span>Setting up...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "1.2rem" }}>🚀</span>
            <span>Continue</span>
          </>
        )}
      </button>

      <div style={{
        textAlign: "center",
        padding: "1rem",
        background: "linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)",
        borderRadius: "12px",
        border: "1px solid rgba(102, 126, 234, 0.1)"
      }}>
        <p style={{
          margin: 0,
          fontSize: "0.85rem",
          color: "#666",
          lineHeight: "1.6"
        }}>
          💡 <strong>Pro tip:</strong> Choose a fun nickname and share something unique about yourself to make great first impressions!
        </p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default ProfileSetup;
