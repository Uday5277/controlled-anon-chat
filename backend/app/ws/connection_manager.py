from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections = {}

    async def connect(self, websocket: WebSocket, device_id: str):
        await websocket.accept()
        self.active_connections[device_id] = websocket

    def disconnect(self, device_id: str):
        self.active_connections.pop(device_id, None)

    async def send_personal_message(self, message: str, device_id: str):
        websocket = self.active_connections.get(device_id)
        if websocket:
            await websocket.send_text(message)
