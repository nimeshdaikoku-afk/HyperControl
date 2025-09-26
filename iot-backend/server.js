const mqtt = require("mqtt");
const { Pool } = require("pg");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const SECRET = "supersecret"; // replace with secure secret
const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: "iotuser",
  host: "localhost",
  database: "iotdb",
  password: "iotpass",
  port: 5432,
});

// MQTT broker with credentials
const client = mqtt.connect("mqtt://localhost", {
  username: "neevDev",
  password: "Neev123#"
});

client.on("connect", () => {
  console.log("MQTT connected");
  client.subscribe("neevrfc/boot");
  client.subscribe("neevrfc/+/+/cmd");
  client.subscribe("neevrfc/+/+/status");
  client.subscribe("neevrfc/+/+/telemetry");
  client.subscribe("neevrfc/group/+/cmd");
});


function generateOpaqueToken() {
  return crypto.randomBytes(16).toString("hex"); // 32-char token
}


// Verify token from topic
async function verifyTopic(topic) {
  const parts = topic.split("/");
  if (parts.length < 4) return null;
  const device_id = parts[1];
  const token = parts[2];

  const result = await pool.query(
    "SELECT opaque_token FROM devices WHERE id=$1",
    [device_id]
  );
const expected = result.rows[0].opaque_token;
  if (result.rows.length === 0) return null;
  if (result.rows[0].opaque_token.trim() !== token.trim()){
  console.log("verifyTopic: token mismatch for", device_id);}
    console.log("Send onToken-", token ," Device_id", device_id);
  return device_id;
}

// Handle MQTT messages
client.on("message", async (topic, message) => {
  try {
    if (topic === "neevrfc/boot") {
      const { device_id } = JSON.parse(message.toString());
      const result = await pool.query("SELECT opaque_token FROM devices WHERE id=$1", [device_id]);

      if (result.rows.length > 0) {
        client.publish(`neevrfc/${device_id}/auth`, JSON.stringify({
          jwt: result.rows[0].opaque_token
        }));
        console.log(`Auth token sent to ${device_id}`);
      } else {
        console.log(`Unregistered device boot attempt: ${device_id}`);
      }
      return;
    }

    const msg = JSON.parse(message.toString());
    const deviceId = await verifyTopic(topic);

    if (!deviceId) {
      console.log("Unauthorized MQTT:", topic);
      return;
    }

    if (topic.includes("/status")) {
      const ledStatus = msg.LED_status || "UNKNOWN";
      const ts = msg.Time || new Date();
      await pool.query(
        `INSERT INTO device_status (device_id, led_status, last_seen)
         VALUES ($1, $2, $3)
         ON CONFLICT (device_id)
         DO UPDATE SET led_status = EXCLUDED.led_status, last_seen = EXCLUDED.last_seen`,
        [deviceId, ledStatus, ts]
      );
    } else if (topic.includes("/telemetry")) {
	     if (!deviceId) {
    		console.log("Telemetry rejected, invalid token/topic:", topic);
    		return;
  		}
		console.log("Telemetry insert " , topic , deviceId, msg);
	    	const ts = msg.Time ? new Date(msg.Time) : new Date();
  		await pool.query(
    		"INSERT INTO telemetry (device_id, ts , topic, payload) VALUES ($1,$2,$3,$4::jsonb)",
    			[deviceId, ts, topic, JSON.stringify(msg)]
  );
    } else if (topic.includes("/cmd")) {
	    console.log("Command received:", deviceId, msg);
	    if (msg.cmd === "setGroup") {
		    const group_id = msg.data.group_id;
		    const result = await pool.query(
			    "INSERT INTO groups (group_id) VALUES ($1) ON CONFLICT (group_id) DO UPDATE SET group_id=EXCLUDED.group_id RETURNING group_code",
			    [group_id]
		    );
		    const groupCode = result.rows[0].group_code;

		    await pool.query(
			    `UPDATE devices SET group_code=$1 WHERE id=$2`,
			    [groupCode, deviceId]
		    );

		    client.publish(`neevrfc/${deviceId}/${msg.jwt}/cmd`, JSON.stringify({
			    cmd: "setGroupCode",
			    data: { group_code: groupCode }
		    }));
	    }
	    else if (msg.cmd === "getconfigdata") {
		    // Device confirms config set
		    await pool.query(
				`INSERT INTO device_config (device_id, config, updated_at)
				VALUES ($1, $2::jsonb, NOW())
				ON CONFLICT (device_id)
			    	DO UPDATE SET config=EXCLUDED.config, updated_at=NOW()`,
				[deviceId, JSON.stringify(msg.data)]
		    );
		    console.log(`Config updated for ${deviceId}`);
	    }	    
    } else if (topic.startsWith("neevrfc/group/")) {
	    console.log("Group command:", topic, msg);
    }
  } catch (err) {
	  console.error("Error processing MQTT:", err.message);
  }
});

// Commission API
app.post("/api/devices/commission", async (req, res) => {
  const { device_id, latitude, longitude, group_id } = req.body;
  if (!device_id) return res.status(400).json({ error: "device_id required" });

  const token = generateOpaqueToken();

  let groupCode = null;
  if (group_id) {
    const result = await pool.query(
      "INSERT INTO groups (group_id) VALUES ($1) ON CONFLICT (group_id) DO UPDATE SET group_id=EXCLUDED.group_id RETURNING group_code",
      [group_id]
    );
    groupCode = result.rows[0].group_code;
  }

  await pool.query(
    `INSERT INTO devices (id, name, latitude, longitude, opaque_token, group_code) 
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE 
     SET latitude=$3, longitude=$4, opaque_token=$5, group_code=$6`,
    [device_id, device_id, latitude, longitude, token, groupCode]
  );

  res.json({ device_id, token, group_code: groupCode });
});


// Groups API
app.get("/api/groups", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM groups ORDER BY group_code");
  res.json(rows);
});

// Device APIs
app.get("/api/devices", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT d.id, d.name, g.group_id, d.group_code
    FROM devices d
    LEFT JOIN groups g ON d.group_code = g.group_code
    ORDER BY d.id
  `);
  res.json(rows);
});

app.get("/api/devices/:id/telemetry", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id AS telemetry_id,
            device_id AS id,
            ts,
            topic,
            payload
     FROM telemetry
     WHERE device_id=$1
     ORDER BY ts DESC
     LIMIT 20`,
    [req.params.id]
  );
    //"SELECT * FROM telemetry WHERE device_id=$1 ORDER BY ts DESC LIMIT 20",
    //[req.params.id]
  res.json(rows);
});

app.get("/api/devices/status", async (req, res) => {
  const { rows } = await pool.query(`
    SELECT device_id AS id, led_status, last_seen
    FROM device_status
    ORDER BY device_id
  `);
		//await pool.query("SELECT * FROM device_status ORDER BY device_id");
  res.json(rows);
});

app.post("/api/devices/:id/command", async (req, res) => {
  const { id } = req.params;
  const { cmd, data } = req.body;

  // fetch token from DB
  const result = await pool.query("SELECT opaque_token FROM devices WHERE id=$1", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Device not found" });
  }

  const token = result.rows[0].opaque_token;
  const topic = `neevrfc/${id}/${token}/cmd`;

  client.publish(topic, JSON.stringify({ cmd, data }));

  res.json({ success: true });
});

app.get("/api/devices/:id/config", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query("SELECT opaque_token FROM devices WHERE id=$1", [id]);
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Device not found" });
  }

  const token = result.rows[0].opaque_token;
  const topic = `neevrfc/${id}/${token}/cmd`;

  const payload = { cmd: "getconfigdata", data: {} };
  client.publish(topic, JSON.stringify(payload));
  console.log(`Publishing GETCONFIGDATA to ${topic}`);

  // For now just respond OK — in future we should capture device response
  res.json({ success: true, message: "Config request sent" });
});

// Unified devices API (devices + group + status)
app.get("/api/devices/full", async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT d.id,
             d.name,
             d.latitude,
             d.longitude,
             d.group_code,
             g.group_id AS group_name,
             s.led_status,
             s.last_seen
      FROM devices d
      LEFT JOIN groups g ON d.group_code = g.group_code
      LEFT JOIN device_status s ON d.id = s.device_id
      ORDER BY d.id
    `);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching full devices:", err.message);
    res.status(500).json({ error: "Failed to fetch devices" });
  }
});


app.listen(4000, () => console.log("Backend API running on port 4000"));

