#!/bin/bash

# --- CONFIG ---
API_URL="http://localhost:4000"
MQTT_HOST="localhost"
MQTT_USER="neevDev"
MQTT_PASS="Neev123#"

DEVICE_ID=$1
ACTION=$2
LAT="12.7"
LNG="55.8"
GROUP_ID="StreetA"

if [ -z "$DEVICE_ID" ] || [ -z "$ACTION" ]; then
  echo "Usage: $0 <device_id> <commission|boot|status|telemetry|subscribe>"
  exit 1
fi

# Helper: get token from DB via API
get_token() {
  curl -s "$API_URL/api/devices" | jq -r ".[] | select(.id==\"$DEVICE_ID\") | .opaque_token"
}

case $ACTION in
  commission)
    echo "Commissioning device $DEVICE_ID ..."
    RESP=$(curl -s -X POST "$API_URL/api/devices/commission" \
      -H "Content-Type: application/json" \
      -d "{\"device_id\":\"$DEVICE_ID\",\"latitude\":$LAT,\"longitude\":$LNG,\"group_id\":\"$GROUP_ID\"}")
    echo "Response: $RESP"
    TOKEN=$(echo $RESP | jq -r '.token')
    echo "Opaque token: $TOKEN"
    ;;

  boot)
    echo "Simulating boot for $DEVICE_ID ..."
    mosquitto_pub -h $MQTT_HOST -u $MQTT_USER -P $MQTT_PASS \
      -t "neevrfc/boot" -m "{\"device_id\":\"$DEVICE_ID\"}"
    ;;

  status)
    TOKEN=$(get_token)
    echo "Publishing status for $DEVICE_ID with token $TOKEN ..."
    mosquitto_pub -h $MQTT_HOST -u $MQTT_USER -P $MQTT_PASS \
      -t "neevrfc/$DEVICE_ID/$TOKEN/status" \
      -m "{\"LED_status\":\"ON\",\"Time\":\"$(date '+%Y-%m-%d %H:%M:%S')\"}"
    ;;

  telemetry)
    TOKEN=$(get_token)
    echo "Publishing telemetry for $DEVICE_ID with token $TOKEN ..."
    mosquitto_pub -h $MQTT_HOST -u $MQTT_USER -P $MQTT_PASS \
      -t "neevrfc/$DEVICE_ID/$TOKEN/telemetry" \
      -m "{\"Em_data\":\"{ \\\"ActivePower_ins\\\": 0, \\\"ApparentPower_inst\\\": 0, \\\"Current_inst\\\": 0, \\\"RmsVoltage\\\": 235 }\",\"Time\":\"$(date '+%Y-%m-%d %H:%M:%S')\"}"
    ;;

  subscribe)
    TOKEN=$(get_token)
    echo "Subscribing to commands for $DEVICE_ID with token $TOKEN ..."
    mosquitto_sub -h $MQTT_HOST -u $MQTT_USER -P $MQTT_PASS \
      -t "neevrfc/$DEVICE_ID/$TOKEN/cmd"
    ;;

  *)
    echo "Unknown action: $ACTION"
    echo "Usage: $0 <device_id> <commission|boot|status|telemetry|subscribe>"
    ;;
esac

