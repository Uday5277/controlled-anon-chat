// import { useEffect, useRef, useState } from "react";

// function CameraCapture({ onCapture }) {
//   const videoRef = useRef(null);
//   const canvasRef = useRef(null);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     async function startCamera() {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: true,
//         });
//         videoRef.current.srcObject = stream;
//       } catch (err) {
//         setError("Camera access denied or unavailable");
//       }
//     }

//     startCamera();

//     return () => {
//       if (videoRef.current && videoRef.current.srcObject) {
//         videoRef.current.srcObject.getTracks().forEach(track => track.stop());
//       }
//     };
//   }, []);

//   const captureImage = () => {
//     const video = videoRef.current;
//     const canvas = canvasRef.current;

//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const ctx = canvas.getContext("2d");
//     ctx.drawImage(video, 0, 0);

//     const imageBase64 = canvas.toDataURL("image/jpeg");
//     onCapture(imageBase64);
//   };

//   return (
//     <div>
//       <h3>Live Camera Verification</h3>

//       {error && <p style={{ color: "red" }}>{error}</p>}

//       <video
//         ref={videoRef}
//         autoPlay
//         playsInline
//         style={{ width: "300px", borderRadius: "8px" }}
//       />

//       <br />

//       <button onClick={captureImage} style={{ marginTop: "10px" }}>
//         Capture Photo
//       </button>

//       <canvas ref={canvasRef} style={{ display: "none" }} />
//     </div>
//   );
// }

// export default CameraCapture;


import { useEffect, useRef, useState } from "react";

function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        setError("Camera access denied or unavailable");
      }
    }

    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = () => {
    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
    
    // Visual feedback
    setTimeout(() => {
      onCapture(imageBase64);
      setCapturing(false);
    }, 300);
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "1.5rem",
      animation: "fadeIn 0.5s ease-out"
    }}>
      <div style={{
        textAlign: "center",
        marginBottom: "1rem"
      }}>
        <div style={{
          fontSize: "3rem",
          marginBottom: "0.75rem",
          animation: "fadeIn 0.8s ease-out"
        }}>
          📸
        </div>
        <h3 style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.5rem",
          fontWeight: "700",
          color: "#2d3436"
        }}>
          Verify Your Identity
        </h3>
        <p style={{
          margin: 0,
          color: "#636e72",
          fontSize: "0.95rem",
          lineHeight: "1.6"
        }}>
          Take a quick selfie to verify you're human.<br/>
          This helps keep our community safe! 🛡️
        </p>
      </div>

      {error && (
        <div style={{
          width: "100%",
          background: "linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%)",
          color: "#fff",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          boxShadow: "0 4px 16px rgba(255, 107, 107, 0.3)",
          animation: "slideIn 0.4s ease-out",
          textAlign: "center"
        }}>
          <strong>⚠️ {error}</strong>
        </div>
      )}

      <div style={{
        position: "relative",
        borderRadius: "20px",
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.15)",
        background: "#000",
        width: "100%",
        maxWidth: "400px",
        aspectRatio: "4/3"
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block"
          }}
        />
        
        {/* Camera overlay frame */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: "3px solid rgba(255, 255, 255, 0.3)",
          borderRadius: "20px",
          pointerEvents: "none"
        }}>
          {/* Corner decorations */}
          {[
            { top: "10px", left: "10px", borderTop: "4px solid #fff", borderLeft: "4px solid #fff" },
            { top: "10px", right: "10px", borderTop: "4px solid #fff", borderRight: "4px solid #fff" },
            { bottom: "10px", left: "10px", borderBottom: "4px solid #fff", borderLeft: "4px solid #fff" },
            { bottom: "10px", right: "10px", borderBottom: "4px solid #fff", borderRight: "4px solid #fff" }
          ].map((style, i) => (
            <div key={i} style={{
              position: "absolute",
              width: "30px",
              height: "30px",
              ...style
            }} />
          ))}
        </div>

        {/* Loading state */}
        {!isReady && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            color: "#fff"
          }}>
            <div style={{
              width: "40px",
              height: "40px",
              border: "4px solid rgba(255, 255, 255, 0.3)",
              borderTop: "4px solid #fff",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
            <p style={{ margin: 0, fontSize: "0.9rem" }}>Initializing camera...</p>
          </div>
        )}

        {/* Capture flash effect */}
        {capturing && (
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "#fff",
            animation: "flash 0.3s ease-out"
          }} />
        )}
      </div>

      <button 
        onClick={captureImage} 
        disabled={!isReady || capturing}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "1rem 2rem",
          fontSize: "1.1rem",
          fontWeight: "700",
          background: isReady && !capturing 
            ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            : "#ddd",
          color: "#fff",
          border: "none",
          borderRadius: "12px",
          cursor: isReady && !capturing ? "pointer" : "not-allowed",
          boxShadow: isReady && !capturing 
            ? "0 8px 24px rgba(102, 126, 234, 0.4)"
            : "none",
          transition: "all 0.3s ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem"
        }}
      >
        {capturing ? (
          <>
            <span style={{ fontSize: "1.2rem" }}>📸</span>
            <span>Processing...</span>
          </>
        ) : !isReady ? (
          <>
            <span style={{ fontSize: "1.2rem" }}>⏳</span>
            <span>Preparing Camera...</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "1.2rem" }}>📸</span>
            <span>Take Photo</span>
          </>
        )}
      </button>

      <div style={{
        textAlign: "center",
        maxWidth: "400px"
      }}>
        <p style={{
          margin: 0,
          fontSize: "0.85rem",
          color: "#999",
          lineHeight: "1.5"
        }}>
          🔒 Your photo is processed securely and never stored permanently
        </p>
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes flash {
          0% { opacity: 1; }
          50% { opacity: 0.8; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default CameraCapture;
