from deepface import DeepFace
import numpy as np
import cv2
import base64
from io import BytesIO
from PIL import Image


def classify_gender(image_base64: str) -> str:
    """
    Real AI-based gender classification.
    Falls back safely if anything fails.
    """

    try:
        # Decode base64 image
        image_data = base64.b64decode(image_base64.split(",")[1])
        image = Image.open(BytesIO(image_data)).convert("RGB")

        # Convert PIL -> OpenCV format
        img_array = np.array(image)
        img_array = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # DeepFace analysis
        result = DeepFace.analyze(
            img_array,
            actions=["gender"],
            enforce_detection=False
        )

        gender = result[0]["dominant_gender"]
        return "Male" if gender.lower() == "man" else "Female"

    except Exception as e:
        # SAFE fallback (never break the app)
        return "None"
