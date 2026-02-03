from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        self.active_connections[device_id] = websocket
        print(f"[WS] {device_id} connected. Total: {len(self.active_connections)}")

    def disconnect(self, device_id: str):
        if device_id in self.active_connections:
            del self.active_connections[device_id]
        print(f"[WS] {device_id} disconnected. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, device_id: str):
        """Send a message to a specific device."""
        websocket = self.active_connections.get(device_id)
        if websocket:
            try:
                await websocket.send_text(message)
                print(f"[WS] Sent to {device_id}: {message[:50]}...")
            except Exception as e:
                print(f"[WS] Failed to send to {device_id}: {e}")
                # Remove the dead connection
                self.active_connections.pop(device_id, None)
        else:
            print(f"[WS] {device_id} not connected")
