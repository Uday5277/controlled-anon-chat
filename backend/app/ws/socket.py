from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..ws.connection_manager import ConnectionManager

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    device_id = websocket.query_params.get("device_id")

    if not device_id:
        await websocket.close()
        return

    await manager.connect(websocket, device_id)

    try:
        while True:
            data = await websocket.receive_text()
            # echo back for now
            await manager.send_personal_message(
                f"Echo: {data}", device_id
            )
    except WebSocketDisconnect:
        manager.disconnect(device_id)
