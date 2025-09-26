#!/bin/bash
# Simulate streetlight device lifecycle with MQTT auth
# Usage: ./simulate_device.sh <device_id>

DEVICE_ID=$1
BROKER="localhost"
MQTT_USER="neevDev"
MQTT_PASS="Neev123#"
API_URL="http://localhost:4000"
LAT="12.34"
LNG="77.56"
GROUP_ID="streetA"

if [ -z "$DEVICE_ID" ]; then
  echo "Usage: $0 <device_id>"
  exit 1
fi

echo "=== Step 1: Commission device $DEVICE_ID via API ==="
TOKEN=$(curl -s -X POST "$API_URL/api/devices/commission" \
  -H "Content-Type: application/json" \
  -d "{\"device_id\":\"$DEVICE_ID\",\"latitude\":$LAT,\"longitude\":$LNG,\"group_id\":\"$GROUP_ID\"}" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "Failed to commission device"
  exit 1
fi

echo "Device commissioned with JWT: $TOKEN"

echo "=== Step 2: Boot ==="
mosquitto_pub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/boot" -m "{\"device_id\":\"$DEVICE_ID\"}"

echo "=== Step 3: Subscribe to auth response ==="
mosquitto_sub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/$DEVICE_ID/auth" -C 1 > auth.json
NEW_TOKEN=$(jq -r '.jwt' auth.json)
echo "Received JWT: $NEW_TOKEN"

TOKEN=$NEW_TOKEN

echo "=== Step 4: Subscribe to command topics ==="
mosquitto_sub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/$DEVICE_ID/$TOKEN/cmd" > /tmp/${DEVICE_ID}_cmd.log &
CMD_PID=$!

echo "=== Step 5: Publish Status ==="
mosquitto_pub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/$DEVICE_ID/$TOKEN/status" \
  -m "{\"LED_status\":\"ON\",\"Time\":\"$(date '+%Y-%m-%d %H:%M:%S')\"}"

echo "=== Step 6: Publish Telemetry ==="
mosquitto_pub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/$DEVICE_ID/$TOKEN/telemetry" \
  -m "{\"Em_data\":\"{ \\\"ActivePower_ins\\\": 100, \\\"RmsVoltage\\\": 230, \\\"Frequency\\\": 50 }\",\"Time\":\"$(date '+%Y-%m-%d %H:%M:%S')\"}"

echo "=== Step 7: Subscribe to Group Commands ($GROUP_ID) ==="
mosquitto_sub -h $BROKER -u $MQTT_USER -P $MQTT_PASS \
  -t "neevrfc/group/$GROUP_ID/cmd" > /tmp/${DEVICE_ID}_group.log &
GROUP_PID=$!

echo "=== Device simulation running. Try sending commands from backend. ==="
echo "Check logs: /tmp/${DEVICE_ID}_cmd.log and /tmp/${DEVICE_ID}_group.log"

trap "kill $CMD_PID $GROUP_PID; rm -f auth.json" EXIT
wait

