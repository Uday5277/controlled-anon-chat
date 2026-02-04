import { useEffect, useMemo, useRef, useState } from "react";
import CameraCapture from "./components/cameraCapture.jsx";
import ProfileSetup from "./components/ProfileSetup.jsx";
import { getDeviceId } from "./utils/deviceId";

const API_BASE = "https://controlled-anon-chat.onrender.com";

function App() {
  const deviceId = useMemo(() => getDeviceId(), []);
  const wsRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const messagesEndRef = useRef(null);

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

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
       `wss://controlled-anon-chat.onrender.com/ws?device_id=${deviceId}`
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
      log("Auto-finding next match immediately...");
      setTimeout(() => findMatch(true), 300);
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      height: "100vh", 
      background: partnerId ? "#f8f9fa" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      position: "relative"
    }}>
      {/* Main content */}
      <div style={{ 
        flex: 1, 
        display: "flex", 
        flexDirection: "column",
        maxWidth: "100%",
        margin: "0 auto"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 2rem",
          background: partnerId ? "#ffffff" : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 2px 16px rgba(0, 0, 0, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: partnerId ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{
              width: "40px",
              height: "40px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)"
            }}>
              💬
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: "1.25rem", 
                fontWeight: "700",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}>
                {partnerId ? `Chatting with ${nickname || "Stranger"}` : "Anonymous Chat"}
              </h2>
              {partnerId && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <span style={{
                    width: "8px",
                    height: "8px",
                    background: "#10b981",
                    borderRadius: "50%",
                    boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                    animation: "pulse 2s infinite"
                  }}></span>
                  <span style={{ fontSize: "0.8rem", color: "#10b981", fontWeight: "500" }}>Online</span>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowDebug(!showDebug)}
            style={{
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              background: "transparent",
              border: "2px solid #e0e0e0",
              borderRadius: "8px",
              cursor: "pointer",
              color: "#666",
              fontWeight: "600",
              transition: "all 0.3s ease"
            }}
          >
            {showDebug ? "🐛 Hide" : "🐛 Debug"}
          </button>
        </div>

        {/* Main scrollable content */}
        <div style={{ 
          flex: 1, 
          overflowY: "auto",
          display: "flex",
          justifyContent: "center",
          padding: partnerId ? "0" : "2rem",
        }}>
          <div style={{
            width: "100%",
            maxWidth: partnerId ? "100%" : "600px",
            display: "flex",
            flexDirection: "column",
            height: partnerId ? "100%" : "auto"
          }}>
            {!partnerId && (
              <div style={{
                background: "rgba(255, 255, 255, 0.98)",
                borderRadius: "24px",
                padding: "3rem",
                boxShadow: "0 20px 60px rgba(0, 0, 0, 0.15)",
                backdropFilter: "blur(10px)",
                animation: "fadeIn 0.5s ease-out"
              }}>
                <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                  <div style={{
                    width: "80px",
                    height: "80px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "2.5rem",
                    margin: "0 auto 1.5rem",
                    boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                    animation: "fadeIn 0.8s ease-out"
                  }}>
                    👋
                  </div>
                  <h1 style={{ marginBottom: "0.5rem" }}>Welcome!</h1>
                  <p style={{ color: "#666", fontSize: "1.05rem" }}>
                    Connect with verified users anonymously
                  </p>
                </div>

                {error && (
                  <div style={{
                    background: "linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)",
                    color: "#fff",
                    padding: "1rem 1.25rem",
                    borderRadius: "12px",
                    marginBottom: "1.5rem",
                    boxShadow: "0 4px 16px rgba(255, 107, 107, 0.3)",
                    animation: "slideIn 0.4s ease-out"
                  }}>
                    <strong>⚠️ {error}</strong>
                  </div>
                )}

                {!gender && <CameraCapture onCapture={handleCapture} />}

                {gender && !profileDone && (
                  <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                    <div style={{
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "#fff",
                      padding: "1rem 1.25rem",
                      borderRadius: "12px",
                      marginBottom: "1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                      boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)"
                    }}>
                      <span style={{ fontSize: "1.5rem" }}>✓</span>
                      <div>
                        <strong style={{ display: "block", fontSize: "1.05rem" }}>Verified!</strong>
                        <span style={{ fontSize: "0.9rem", opacity: 0.9 }}>Gender: {gender}</span>
                      </div>
                    </div>
                    <ProfileSetup onComplete={handleProfileComplete} />
                  </div>
                )}

                {gender && profileDone && !partnerId && (
                  <div style={{ animation: "fadeIn 0.5s ease-out" }}>
                    <div style={{
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      color: "#fff",
                      padding: "1.5rem",
                      borderRadius: "16px",
                      marginBottom: "2rem",
                      textAlign: "center",
                      boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)"
                    }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
                      <h3 style={{ margin: "0 0 0.25rem 0", color: "#fff" }}>
                        Hi, {nickname || "Anonymous"}!
                      </h3>
                      <p style={{ margin: 0, fontSize: "0.95rem", opacity: 0.9 }}>
                        Ready to meet someone new?
                      </p>
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <label style={{ 
                        display: "block", 
                        marginBottom: "0.75rem", 
                        fontWeight: "600",
                        color: "#2d3436",
                        fontSize: "0.95rem"
                      }}>
                        🔍 I want to chat with:
                      </label>
                      <select
                        value={preference}
                        onChange={(e) => setPreference(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.875rem 1.125rem",
                          fontSize: "1rem",
                          border: "2px solid #e8e8e8",
                          borderRadius: "12px",
                          background: "#fff",
                          cursor: "pointer",
                          fontWeight: "500"
                        }}
                      >
                        <option value="any">Anyone 🌍</option>
                        <option value="male">Males ♂️</option>
                        <option value="female">Females ♀️</option>
                      </select>
                    </div>

                    <button 
                      onClick={() => findMatch()} 
                      disabled={matchStatus === "finding" || cooldownSeconds > 0}
                      style={{
                        width: "100%",
                        padding: "1rem 2rem",
                        fontSize: "1.1rem",
                        fontWeight: "700",
                        background: cooldownSeconds > 0 ? "#ddd" : "linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        cursor: cooldownSeconds > 0 ? "not-allowed" : "pointer",
                        boxShadow: cooldownSeconds > 0 ? "none" : "0 8px 24px rgba(255, 107, 107, 0.4)",
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      {matchStatus === "finding" ? (
                        <span>🔍 Finding match...</span>
                      ) : cooldownSeconds > 0 ? (
                        <span>⏱️ Wait {cooldownSeconds}s</span>
                      ) : (
                        <span>💬 Start Chatting</span>
                      )}
                    </button>

                    {matchStatus === "queued" && (
                      <div style={{ marginTop: "1.5rem", animation: "fadeIn 0.5s ease-out" }}>
                        <div style={{
                          background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                          color: "#fff",
                          padding: "1.25rem",
                          borderRadius: "12px",
                          marginBottom: "1rem",
                          textAlign: "center",
                          boxShadow: "0 4px 16px rgba(251, 191, 36, 0.3)"
                        }}>
                          <div style={{ 
                            fontSize: "2rem", 
                            marginBottom: "0.5rem",
                            animation: "pulse 2s infinite"
                          }}>
                            ⏳
                          </div>
                          <strong style={{ fontSize: "1.05rem" }}>Searching for a match...</strong>
                          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", opacity: 0.9 }}>
                            This usually takes just a few seconds
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: "0.75rem" }}>
                          <button 
                            onClick={cancelQueue} 
                            style={{
                              flex: 1,
                              background: "#6c757d",
                              boxShadow: "0 4px 12px rgba(108, 117, 125, 0.3)"
                            }}
                          >
                            ✕ Cancel
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
                            style={{
                              flex: 1,
                              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)"
                            }}
                          >
                            🧪 Test Match
                          </button>
                        </div>
                      </div>
                    )}
                    
                    {cooldownSeconds > 0 && !partnerId && (
                      <p style={{ 
                        color: "#666", 
                        marginTop: "1rem", 
                        fontSize: "0.9rem",
                        textAlign: "center",
                        fontStyle: "italic"
                      }}>
                        ⏱️ Please wait {cooldownSeconds} second{cooldownSeconds !== 1 ? "s" : ""} before finding another match
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {partnerId && (
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                height: "100%",
                background: "#f8f9fa"
              }}>
                {/* Messages container */}
                <div
                  style={{
                    flex: 1,
                    padding: "1.5rem",
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                    background: "#ffffff"
                  }}
                >
                  {messages.length === 0 && (
                    <div style={{ 
                      textAlign: "center", 
                      padding: "3rem 1rem",
                      animation: "fadeIn 0.5s ease-out"
                    }}>
                      <div style={{
                        fontSize: "3rem",
                        marginBottom: "1rem",
                        animation: "fadeIn 1s ease-out"
                      }}>👋</div>
                      <h3 style={{ 
                        color: "#2d3436", 
                        marginBottom: "0.5rem",
                        fontSize: "1.25rem" 
                      }}>
                        You're connected!
                      </h3>
                      <p style={{ color: "#636e72", fontSize: "0.95rem" }}>
                        Say hi to start the conversation
                      </p>
                    </div>
                  )}
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      style={{ 
                        display: "flex",
                        justifyContent: msg.from === "me" ? "flex-end" : msg.from === "system" ? "center" : "flex-start",
                        animation: "slideIn 0.3s ease-out"
                      }}
                    >
                      {msg.from === "system" ? (
                        <div style={{
                          background: "rgba(108, 117, 125, 0.1)",
                          color: "#6c757d",
                          padding: "0.5rem 1rem",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                          fontStyle: "italic"
                        }}>
                          {msg.message}
                        </div>
                      ) : (
                        <div
                          style={{
                            maxWidth: "70%",
                            background: msg.from === "me" 
                              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                              : "#e9ecef",
                            color: msg.from === "me" ? "#fff" : "#2d3436",
                            padding: "0.875rem 1.125rem",
                            borderRadius: msg.from === "me" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                            wordWrap: "break-word",
                            fontSize: "0.95rem",
                            lineHeight: "1.5",
                            boxShadow: msg.from === "me" 
                              ? "0 2px 8px rgba(102, 126, 234, 0.3)"
                              : "0 2px 8px rgba(0, 0, 0, 0.05)"
                          }}
                        >
                          {msg.message}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div style={{ 
                  padding: "1.25rem", 
                  background: "#fff",
                  borderTop: "1px solid #e8e8e8",
                  boxShadow: "0 -2px 16px rgba(0, 0, 0, 0.05)"
                }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                    <input
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                      placeholder="Type your message..."
                      style={{ 
                        flex: 1,
                        padding: "0.875rem 1.25rem",
                        border: "2px solid #e8e8e8",
                        borderRadius: "24px",
                        fontSize: "0.95rem",
                        outline: "none",
                        transition: "all 0.3s ease",
                        background: "#f8f9fa"
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#667eea";
                        e.target.style.background = "#fff";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#e8e8e8";
                        e.target.style.background = "#f8f9fa";
                      }}
                    />
                    <button 
                      onClick={sendMessage}
                      disabled={!text.trim()}
                      style={{
                        width: "48px",
                        height: "48px",
                        padding: 0,
                        background: text.trim() 
                          ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                          : "#e9ecef",
                        border: "none",
                        borderRadius: "50%",
                        cursor: text.trim() ? "pointer" : "not-allowed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1.25rem",
                        boxShadow: text.trim() 
                          ? "0 4px 12px rgba(102, 126, 234, 0.4)"
                          : "none",
                        transition: "all 0.3s ease"
                      }}
                    >
                      {text.trim() ? "🚀" : "💬"}
                    </button>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{
                  padding: "1rem 1.25rem",
                  background: "#fff",
                  borderTop: "1px solid #e8e8e8",
                  display: "flex",
                  gap: "0.75rem"
                }}>
                  <button 
                    onClick={() => endChat("leave")}
                    style={{ 
                      flex: 1, 
                      padding: "0.75rem",
                      background: "#6c757d",
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      boxShadow: "0 2px 8px rgba(108, 117, 125, 0.3)"
                    }}
                  >
                    👋 Leave
                  </button>
                  <button 
                    onClick={() => endChat("next")}
                    style={{ 
                      flex: 1, 
                      padding: "0.75rem",
                      background: "linear-gradient(135deg, #4ecdc4 0%, #44a8a0 100%)",
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      boxShadow: "0 2px 8px rgba(78, 205, 196, 0.3)"
                    }}
                  >
                    ⏭️ Next
                  </button>
                  <button 
                    onClick={() => endChat("report")}
                    style={{ 
                      flex: 1, 
                      padding: "0.75rem",
                      background: "linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)",
                      color: "#fff",
                      fontSize: "0.9rem",
                      fontWeight: "600",
                      boxShadow: "0 2px 8px rgba(255, 107, 107, 0.3)"
                    }}
                  >
                    🚨 Report
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug panel - togglable */}
      {showDebug && (
        <div
          style={{
            width: "320px",
            background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
            color: "#00ff88",
            padding: "1.5rem",
            fontFamily: "'Courier New', monospace",
            fontSize: "11px",
            overflowY: "auto",
            borderLeft: "3px solid #00ff88",
            boxShadow: "-4px 0 20px rgba(0, 0, 0, 0.3)"
          }}
        >
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "0.5rem",
            marginBottom: "1rem",
            paddingBottom: "1rem",
            borderBottom: "2px solid rgba(0, 255, 136, 0.2)"
          }}>
            <span style={{ fontSize: "1.2rem" }}>🐛</span>
            <h4 style={{ margin: 0, color: "#00ff88", fontSize: "1rem", fontWeight: "700" }}>
              DEBUG CONSOLE
            </h4>
          </div>
          <div style={{ 
            whiteSpace: "pre-wrap", 
            wordBreak: "break-word",
            lineHeight: "1.6",
            color: "#00ff88"
          }}>
            {debug}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
