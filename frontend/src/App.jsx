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


import { useEffect, useMemo, useRef, useState } from "react";
import CameraCapture from "./components/cameraCapture.jsx";
import ProfileSetup from "./components/ProfileSetup.jsx";
import { getDeviceId } from "./utils/deviceId";

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  const [gender, setGender] = useState("");
  const [profileDone, setProfileDone] = useState(false);
  const [nickname, setNickname] = useState("");
  const [preference, setPreference] = useState("any");
  const [matchStatus, setMatchStatus] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [debug, setDebug] = useState("Initializing...");
  const [showDebug, setShowDebug] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Log debug info
  const log = (msg) => {
    console.log(msg);
    setDebug((prev) => `${msg}\n${prev}`.split("\n").slice(0, 5).join("\n"));
  };

  useEffect(() => {
    log("App initialized. Device ID: " + deviceId.substring(0, 8) + "...");
    fetch(`${API_BASE}/onboarding/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    })
      .then((res) => res.json())
      .then((data) => log("Onboarding init: " + data.status))
      .catch((err) => log("Onboarding error: " + err.message));

    // Check if banned on startup
    fetch(`${API_BASE}/safety/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((e) => Promise.reject(e));
        return res.json();
      })
      .then(() => log("Safety check: OK"))
      .catch((err) => {
        const msg = err.detail || err.message || "Banned";
        log("Safety check failed: " + msg);
        setError(msg);
      });
  }, [deviceId]);

  // WebSocket connection when partner is found
  useEffect(() => {
    if (!partnerId) return;

    log("Connecting WebSocket to partner: " + partnerId.substring(0, 8) + "...");
    const socket = new WebSocket(
      `ws://127.0.0.1:8000/ws?device_id=${deviceId}`
    );
    wsRef.current = socket;

    socket.onopen = () => {
      log("WebSocket connected ✓");
    };

    socket.onmessage = (event) => {
      log("Received: " + event.data.substring(0, 50) + "...");
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === "chat") {
          log("Chat from " + payload.from.substring(0, 8) + ": " + payload.message);
          setMessages((prev) => [
            ...prev,
            { from: "partner", message: payload.message },
          ]);
          return;
        }
        
        if (payload.type === "delivery") {
          log("Delivery confirmed: " + payload.message);
          // Delivery confirmation - just log it, message already added locally
          return;
        }
        
        if (payload.type === "ended") {
          log("Chat ended: " + payload.reason);
          const reasonText = {
            "leave": "Partner left the chat",
            "next": "Partner moved to next chat",
            "report": "Chat ended"
          }[payload.reason] || "Chat ended";
          
          setMessages((prev) => [...prev, { 
            from: "system", 
            message: "⚠️ " + reasonText 
          }]);
          
          // Wait 2 seconds then clear
          setTimeout(() => {
            setMatchStatus("");
            setPartnerId("");
          }, 2000);
          
          return;
        }
        
        if (payload.type === "system") {
          log("System: " + payload.message);
          setMessages((prev) => [
            ...prev,
            { from: "system", message: payload.message },
          ]);
          return;
        }
      } catch (e) {
        log("JSON parse error: " + e.message);
        setMessages((prev) => [
          ...prev,
          { from: "system", message: event.data },
        ]);
      }
    };

    socket.onerror = (err) => {
      log("WebSocket error: " + (err.message || "unknown"));
    };

    socket.onclose = (event) => {
      log("WebSocket closed: code " + event.code);
      wsRef.current = null;
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [partnerId, deviceId]);

  // Poll for match status while queued
  useEffect(() => {
    if (matchStatus !== "queued") {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    log("Starting polling for match...");
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/match/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId }),
        });
        const data = await response.json();
        if (data.status === "matched") {
          log("Match found: " + data.partner_id.substring(0, 8) + "...");
          setPartnerId(data.partner_id);
          setMatchStatus("matched");
          setMessages([]);
        }
      } catch (err) {
        log("Poll error: " + err.message);
      }
    }, 1500);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [matchStatus, deviceId]);

  const handleCapture = async (imageBase64) => {
    setError("");
    log("Sending image for verification...");
    const response = await fetch(`${API_BASE}/verify/gender`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        image_base64: imageBase64,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      const msg = data.detail || "Verification failed";
      setError(msg);
      log("Verification error: " + msg);
      return;
    }
    log("Gender verified: " + data.gender);
    setGender(data.gender);
  };

  const handleProfileComplete = (name) => {
    setProfileDone(true);
    setNickname(name || "");
    log("Profile set: " + name);
  };

  const findMatch = async (autoNext = false) => {
    setError("");
    log("Finding match with preference: " + preference);
    setMatchStatus("finding");
    
    // Check user state
    try {
      const debugRes = await fetch(`${API_BASE}/match/debug`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: String(deviceId), }),
      });
      const debugData = await debugRes.json();
      log("User state: gender=" + debugData.gender + ", pref=" + debugData.preference);
    } catch (e) {
      log("Debug fetch failed");
    }

    const requestBody = {
      device_id: String(deviceId),
      preference: String(preference),
      is_next: Boolean(autoNext),
    };
    
    const response = await fetch(`${API_BASE}/match/find`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    
    if (!response.ok) {
      setMatchStatus("");
      const msg = data.detail || "Match failed";
      setError(msg);
      log("Match error: " + msg);
      return;
    }

    if (data.status === "matched") {
      log("Instant match: " + data.partner_id.substring(0, 8) + "...");
      setPartnerId(data.partner_id);
      setMatchStatus("matched");
      setMessages([]);
      return;
    }

    log("Queued, polling for match...");
    setMatchStatus("queued");
  };

  const cancelQueue = async () => {
    log("Leaving queue...");
    await fetch(`${API_BASE}/queue/leave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId }),
    }).catch(() => {});
    setMatchStatus("");
  };

  const sendMessage = () => {
    const message = text.trim();
    if (!message || !wsRef.current) {
      if (!wsRef.current) log("WebSocket not connected");
      return;
    }
    
    log("Sending: " + message);
    if (wsRef.current.readyState !== WebSocket.OPEN) {
      log("WebSocket not ready (state: " + wsRef.current.readyState + ")");
      return;
    }
    
    wsRef.current.send(JSON.stringify({ type: "chat", message }));
    setMessages((prev) => [...prev, { from: "me", message }]);
    setText("");
  };

  const endChat = (reason) => {
    log("Ending chat: " + reason);
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: reason }));
    }
    setPartnerId("");
    setMatchStatus("");
    setMessages([]);
    
    // Only set cooldown for "Leave" action (to prevent spam)
    // "Next" should allow immediate re-queuing (continuing to chat)
    // "Report" should also have cooldown (anti-abuse)
    if (reason === "leave" || reason === "report") {
      setCooldownSeconds(1);
      const timer = setInterval(() => {
        setCooldownSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (reason === "next") {
      // For "Next", auto-find immediately (no cooldown, bypass backend check)
      log("Auto-finding next match immediately...");
      setTimeout(() => findMatch(true), 300);  // true = is_next
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", backgroundColor: "#fff" }}>
      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        backgroundColor: partnerId ? "#ffffff" : "#e8f4f8"
      }}>
        {/* Header */}
        <div style={{
          padding: "1rem",
          borderBottom: "1px solid #ddd",
          backgroundColor: partnerId ? "#007AFF" : "#0078d4",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <h2 style={{ margin: 0, fontSize: "1.1rem" }}>
            {partnerId ? `Chat with ${nickname || "Friend"}` : "Controlled Anonymity Chat"}
          </h2>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.8rem",
              backgroundColor: partnerId ? "rgba(255,255,255,0.3)" : "#ddd",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              color: partnerId ? "#fff" : "#000"
            }}
          >
            {showDebug ? "Hide Debug" : "Show Debug"}
          </button>
        </div>

        {/* Main scrollable content */}
        <div style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
          <h1 style={{ display: partnerId ? "none" : "block" }}>Controlled Anonymity Chat</h1>

        {!gender && <CameraCapture onCapture={handleCapture} />}

        {gender && !profileDone && (
          <>
            <p style={{ color: "green" }}>✓ Verified: {gender}</p>
            <ProfileSetup onComplete={handleProfileComplete} />
          </>
        )}

        {gender && profileDone && !partnerId && (
          <div style={{ marginTop: "1.5rem" }}>
            <h3>Hi {nickname || "Anonymous"}</h3>
            <label>
              Match preference:&nbsp;
              <select
                value={preference}
                onChange={(e) => setPreference(e.target.value)}
              >
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </label>

            <div style={{ marginTop: "1rem" }}>
              <button 
                onClick={findMatch} 
                disabled={matchStatus === "finding" || cooldownSeconds > 0}
                style={{
                  opacity: cooldownSeconds > 0 ? 0.5 : 1,
                  cursor: cooldownSeconds > 0 ? "not-allowed" : "pointer"
                }}
              >
                {matchStatus === "finding" ? "Finding..." : cooldownSeconds > 0 ? `Wait ${cooldownSeconds}s` : "Find Match"}
              </button>
              {matchStatus === "queued" && (
                <>
                  <button onClick={cancelQueue} style={{ marginLeft: "0.5rem" }}>
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      log("Creating test match...");
                      const res = await fetch(`${API_BASE}/match/test-match`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ device_id: deviceId }),
                      });
                      const data = await res.json();
                      if (data.status === "matched") {
                        log("Test match created: " + data.partner_id);
                        setPartnerId(data.partner_id);
                        setMatchStatus("matched");
                        setMessages([]);
                      } else {
                        log("Test match failed: " + (data.message || "unknown error"));
                      }
                    }}
                    style={{ marginLeft: "0.5rem", backgroundColor: "#ff9800" }}
                  >
                    Test Match (Demo)
                  </button>
                </>
              )}
            </div>

            {matchStatus === "queued" && (
              <p style={{ color: "orange" }}>⏳ Queued. Waiting for a match... (or click Test Match for demo)</p>
            )}
            
            {cooldownSeconds > 0 && !partnerId && (
              <p style={{ color: "#666", marginTop: "0.5rem", fontStyle: "italic" }}>
                ⏱️ Cooldown: Please wait {cooldownSeconds} second{cooldownSeconds !== 1 ? "s" : ""} before finding another match.
              </p>
            )}
          </div>
        )}

        {partnerId && (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", marginTop: 0 }}>
            {/* Messages container */}
            <div
              style={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: "0",
                padding: "1rem",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem"
              }}
            >
              {messages.length === 0 && (
                <div style={{ textAlign: "center", color: "#999", marginTop: "2rem" }}>
                  <p>👋 Say hi to start the conversation!</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  style={{ 
                    display: "flex",
                    justifyContent: msg.from === "me" ? "flex-end" : "flex-start",
                    marginBottom: "0.25rem"
                  }}
                >
                  <div
                    style={{
                      maxWidth: "70%",
                      backgroundColor: msg.from === "me" ? "#007AFF" : "#e5e5ea",
                      color: msg.from === "me" ? "#fff" : "#000",
                      padding: "0.75rem 1rem",
                      borderRadius: "18px",
                      wordWrap: "break-word",
                      fontSize: "0.95rem"
                    }}
                  >
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>

            {/* Input area */}
            <div style={{ 
              padding: "1rem", 
              borderTop: "1px solid #ddd",
              backgroundColor: "#fff",
              display: "flex",
              gap: "0.5rem"
            }}>
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                placeholder="Type a message"
                style={{ 
                  flex: 1,
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "20px",
                  fontSize: "1rem",
                  outline: "none"
                }}
              />
              <button 
                onClick={sendMessage}
                style={{
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "#007AFF",
                  color: "#fff",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                Send
              </button>
            </div>

            {/* Action buttons */}
            <div style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f5f5f5",
              borderTop: "1px solid #ddd",
              display: "flex",
              gap: "0.5rem",
              fontSize: "0.85rem"
            }}>
              <button 
                onClick={() => endChat("leave")}
                style={{ flex: 1, padding: "0.5rem", backgroundColor: "#999", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Leave
              </button>
              <button 
                onClick={() => endChat("next")}
                style={{ flex: 1, padding: "0.5rem", backgroundColor: "#666", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Next
              </button>
              <button 
                onClick={() => endChat("report")}
                style={{ flex: 1, padding: "0.5rem", backgroundColor: "#d9534f", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
              >
                Report
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Debug panel - togglable */}
      {showDebug && (
        <div
          style={{
            width: "280px",
            backgroundColor: "#222",
            color: "#0f0",
            padding: "1rem",
            fontFamily: "monospace",
            fontSize: "11px",
            overflowY: "auto",
            borderLeft: "1px solid #555",
          }}
        >
          <h4 style={{ margin: "0 0 0.5rem 0", color: "#0f0" }}>DEBUG LOG</h4>
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {debug}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
