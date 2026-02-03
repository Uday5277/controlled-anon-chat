# Privacy & Controlled Anonymity

## Delete-after-verify logic
- The frontend captures a live camera frame only (no gallery upload).
- The image is sent to the backend as base64 for classification.
- The backend performs gender classification and immediately clears the image payload from memory.
- Only the gender result is stored; the image is never written to disk.

## Device ID implementation
- A UUID is generated once per device and stored in localStorage.
- The device ID is used to:
  - Track onboarding and verification state
  - Enforce cooldowns and daily filter limits
  - Associate profiles without collecting PII

## Data retention
- No profile images are stored.
- Chat content is not persisted in the backend.
- Matches and limits are stored temporarily in Redis and expire or are cleared.
