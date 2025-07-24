''' dHouse proxy connection
    Works via Apache tunnel, it is not exposed to the Internet
    Keeps a connection always opened to MQTT
    Speeds up the connection to Javascript
    Jorge Elissalde 2025
'''
import asyncio
import json
import websockets
from asyncio_mqtt import Client as MQTTClient, MqttError

MQTT_HOST = "localhost"
MQTT_PORT = 1883
MQTT_TOPIC_SUB = "#"
MQTT_TOPIC_DEFAULT = "channel/web"
WEBSOCKET_PORT = 8080
RECONNECT_DELAY = 5  # segundos

connected_websockets = set()
mqtt_publish_queue = asyncio.Queue()
stop_publisher_event = asyncio.Event()

device_status = {}	# status of every known device /online, offline

debug = False

# not required, security is handed by Apache
VALID_USERS = {
    "user": "secret",
    "otheruser": "secret"
}

async def websocket_handler(websocket):
    ''' keeps a socket open to client and forward data to/from mqtt '''
    peer_ip = websocket.remote_address[0] if websocket.remote_address else "desconocida"

    #connected_websockets.add(websocket)
    #print("Websock client connected")

    try:
        # not required, security is managed by Apache
        # waits initial auth message
        #
        #auth_msg = await asyncio.wait_for(websocket.recv(), timeout=10)
        #auth_data = json.loads(auth_msg)
        #
        #if auth_data.get("type") != "auth":
        #    await websocket.send(json.dumps({"type": "error", "message": "Auth missing"}))
        #    await websocket.close()
        #    print("Client rejected no 'auth' received")
        #    return
        #
        #username = auth_data.get("username")
        #password = auth_data.get("password")
        #
        #if not username or not password or VALID_USERS.get(username) != password:
        #    await websocket.send(json.dumps({"type": "error", "message": "No valid credentials received"}))
        #    await websocket.close()
        #    print(f"Rejected client, no valid credentials for username: '{username}'")
        #    return

        connected_websockets.add(websocket)
        if debug:
            print("Client authenticated")

        await websocket.send(json.dumps({"type": "welcome", "message": "connected"}))

        while True:
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=3600)
                data = json.loads(message)
                topic = data.get("topic", MQTT_TOPIC_DEFAULT)
                payload = data.get("message", "")

                if debug:
                    print(f"---- message from websocket: {message}")

                if topic == "cmd/dHouse/proxy":
                    # dHouse client command
                    if payload == "DevicesStatus":
                        for device, status in device_status.items():
                            await websocket.send(json.dumps({"topic":f"dhouse/{device}/STATUS", "message": status}))
                    continue

                if debug:
                    print(f"WS >> MQTT in queue: {topic} → {payload}")

                await mqtt_publish_queue.put((topic, payload)) 
            except asyncio.TimeoutError:
                continue
            except websockets.exceptions.ConnectionClosed:
                break
            except Exception as e:
                print(f"Error processing WebSocket data: {e}")

    finally:
        connected_websockets.discard(websocket)
        if debug:
            print("Websock client disconnected")

# MQTT connection
async def mqtt_publisher(mqtt):
    while not stop_publisher_event.is_set():
        try:
            topic, payload = await asyncio.wait_for(mqtt_publish_queue.get(), timeout=1.0)
            try:
                await mqtt.publish(topic, payload)
                if debug:
                    print(f"MQTT publisher: {topic} → {payload}")
            except Exception as e:
                print(f"Error in MQTT publisher: {e}")
        except asyncio.TimeoutError:
            continue
    print("Stopped MQTT publisher")


# store a list with each device status (Online/Offline)
def store_device_status(topic, payload):
    parts = topic.split("/")
    device_id = parts[1]
    device_status[device_id] = payload

# MQTT listener
async def mqtt_listener(mqtt):
    try:
        async with mqtt.messages() as messages:
            await mqtt.subscribe(MQTT_TOPIC_SUB)
            if debug:
                print(f"Subscribed to '{MQTT_TOPIC_SUB}'")

            async for msg in messages:
                topic = str(msg.topic)
                payload = msg.payload.decode()
                if topic.endswith("LWT"):
                    store_device_status(topic, payload)

                if debug:
                    print(f"MQTT >> {topic}: {payload}")

                data = json.dumps({"topic": topic, "message": payload})
                to_remove = []

                for ws in connected_websockets.copy():
                    try:
                        await ws.send(data)
                    except:
                        to_remove.append(ws)

                for ws in to_remove:
                    connected_websockets.discard(ws)

    except MqttError as e:
        print(f"MQTT error: {e}")
    finally:
        stop_publisher_event.set()


async def main():
    # WebSocket handler
    async def ws_wrapper(websocket, _):
        try:
            await websocket_handler(websocket)
        except websockets.exceptions.ConnectionClosedError as e:
            print(f"Websock client connection closed: {e}")
        except Exception as e:
            print(f"Websock unexpected error: {e}")

    # init websocket
    ws_server = await websockets.serve(ws_wrapper, "0.0.0.0", WEBSOCKET_PORT, ping_interval=None)
    print(f"Proxy WebSocket started in ws://localhost:{WEBSOCKET_PORT}")

    while True:
        mqtt = MQTTClient(MQTT_HOST, port=MQTT_PORT)

        try:
            await mqtt.connect()
            print("MQTT connected")

            stop_publisher_event.clear()
            listener_task = asyncio.create_task(mqtt_listener(mqtt))
            publisher_task = asyncio.create_task(mqtt_publisher(mqtt))

            done, pending = await asyncio.wait(
                [listener_task, publisher_task],
                return_when=asyncio.FIRST_EXCEPTION
            )

            for task in done:
                try:
                    task.result()
                except Exception as e:
                    print(f"Task error: {e}")

            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        except MqttError as e:
            print(f"MQTT error: {e}")

        finally:
            try:
                await mqtt.disconnect()
            except Exception:
                pass
            print("MQTT disconnected")

        print(f"Retrying MQTT connection in {RECONNECT_DELAY} seconds")
        await asyncio.sleep(RECONNECT_DELAY)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProxy stopped.")
