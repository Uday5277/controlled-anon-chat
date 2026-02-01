import { useEffect, useRef, useState } from "react";

function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;
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
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageBase64 = canvas.toDataURL("image/jpeg");
    onCapture(imageBase64);
  };

  return (
    <div>
      <h3>Live Camera Verification</h3>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{ width: "300px", borderRadius: "8px" }}
      />

      <br />

      <button onClick={captureImage} style={{ marginTop: "10px" }}>
        Capture Photo
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}

export default CameraCapture;
