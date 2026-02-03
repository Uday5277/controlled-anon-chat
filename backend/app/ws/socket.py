from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..ws.connection_manager import ConnectionManager
from ..db.redis import redis_client
from ..services.moderation import report_user, auto_ban_if_needed, is_banned
import json

router = APIRouter()
manager = ConnectionManager()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    device_id = websocket.query_params.get("device_id")

    if not device_id:
        await websocket.close()
        return

    if is_banned(device_id):
        await websocket.close(code=1008, reason="Banned")
        return

    await manager.connect(websocket, device_id)

    async def get_partner_id() -> str | None:
        return redis_client.get(f"active_match:{device_id}")

    async def end_match(reason: str):
        partner_id = await get_partner_id()
        if partner_id:
            redis_client.delete(f"active_match:{device_id}")
            redis_client.delete(f"active_match:{partner_id}")
            await manager.send_personal_message(
                json.dumps({
                    "type": "ended",
                    "reason": reason
                }),
                partner_id
            )

    try:
        while True:
            raw = await websocket.receive_text()

            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                payload = {"type": "chat", "message": raw}

            msg_type = payload.get("type")

            if msg_type == "chat":
                partner_id = await get_partner_id()
                if not partner_id:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "system",
                            "message": "No active match."
                        }),
                        device_id
                    )
                    continue

                message_text = payload.get("message", "").strip()
                if not message_text:
                    continue

                # Send to partner with logging
                try:
                    msg_obj = {
                        "type": "chat",
                        "from": device_id,
                        "message": message_text
                    }
                    msg_json = json.dumps(msg_obj)
                    print(f"[CHAT] {device_id[:8]} -> {partner_id[:8]}: {message_text[:30]}")
                    await manager.send_personal_message(msg_json, partner_id)
                    print(f"[CHAT] ✓ Delivered to {partner_id[:8]}")
                except Exception as e:
                    print(f"[CHAT] ✗ Error sending to partner {partner_id}: {e}")
                
                # Send delivery confirmation back to sender
                try:
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "delivery",
                            "status": "sent",
                            "message": message_text
                        }),
                        device_id
                    )
                except Exception as e:
                    print(f"[CHAT] ✗ Error sending confirmation to {device_id}: {e}")

            elif msg_type in {"leave", "next"}:
                await end_match(msg_type)
                await manager.send_personal_message(
                    json.dumps({
                        "type": "ended",
                        "reason": msg_type
                    }),
                    device_id
                )

            elif msg_type == "report":
                partner_id = await get_partner_id()
                if partner_id:
                    report_user(partner_id, device_id)
                    if auto_ban_if_needed(partner_id):
                        await manager.send_personal_message(
                            json.dumps({
                                "type": "system",
                                "message": "Your account has been suspended due to reports."
                            }),
                            partner_id
                        )
                await end_match("report")
                await manager.send_personal_message(
                    json.dumps({
                        "type": "ended",
                        "reason": "report"
                    }),
                    device_id
                )

            else:
                await manager.send_personal_message(
                    json.dumps({
                        "type": "error",
                        "message": "Unsupported message type."
                    }),
                    device_id
                )

    except WebSocketDisconnect:
        await end_match("disconnect")
        manager.disconnect(device_id)
