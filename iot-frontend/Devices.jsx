import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:4000";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [deviceStatus, setDeviceStatus] = useState({});
  const [groups, setGroups] = useState({});
  const [selected, setSelected] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [configText, setConfigText] = useState("");

  // Load devices + status + groups
  useEffect(() => {
    async function loadDevices() {
      try {
        const devicesRes = await axios.get(`${API_URL}/api/devices`);
        const statusRes = await axios.get(`${API_URL}/api/devices/status`);
        const groupsRes = await axios.get(`${API_URL}/api/groups`);

        // Build status map keyed by device id
        const statusMap = {};
        statusRes.data.forEach(s => {
          statusMap[s.device_id] = s.led_status;
        });

        // Build group map keyed by group_code
        const groupMap = {};
        groupsRes.data.forEach(g => {
          groupMap[g.group_code] = g.group_id;
        });

        setDevices(devicesRes.data);
        setDeviceStatus(statusMap);
        setGroups(groupMap);
      } catch (err) {
        console.error("Error loading devices:", err.message);
      }
    }
    loadDevices();
  }, []);

  // Load telemetry for selected device
  useEffect(() => {
    if (selected) {
      axios
        .get(`${API_URL}/api/devices/${selected}/telemetry`)
        .then(res => setTelemetry(res.data));
      setConfigText("");
    }
  }, [selected]);

  // Commands
  const sendManual = state => {
    axios
      .post(`${API_URL}/api/devices/${selected}/command`, {
        cmd: "manual",
        data: { lightOn: state }
      })
      .then(() => alert(`Sent light ${state}`));
  };

  const sendConfig = () => {
    let configObj;
    try {
      configObj = JSON.parse(configText);
    } catch {
      alert("Invalid JSON");
      return;
    }
    axios
      .post(`${API_URL}/api/devices/${selected}/command`, {
        cmd: "configdata",
        data: configObj
      })
      .then(() => alert("Config sent"));
  };

  const sendDefaultEEPROM = () => {
    axios
      .post(`${API_URL}/api/devices/${selected}/command`, {
        cmd: "defaultEEPROM",
        data: {}
      })
      .then(() => alert("Default EEPROM sent"));
  };

  const getConfig = () => {
    axios
      .get(`${API_URL}/api/devices/${selected}/config`)
      .then(res => setConfigText(JSON.stringify(res.data, null, 2)))
      .catch(() => alert("Failed to fetch config"));
  };

  return (
    <div className="flex h-full">
      {/* Device List */}
      <div className="w-64 border-r border-gray-700 pr-4 overflow-y-auto">
        <h3 className="font-semibold mb-2">Devices</h3>
        <ul className="space-y-1">
          {devices.map(d => {
            const status = deviceStatus[d.id] || "UNKNOWN";
            const groupName = groups[d.group_code] || "NoGroup";

            return (
              <li
                key={d.id}
                onClick={() => setSelected(d.id)}
                className={`cursor-pointer px-2 py-1 rounded ${
                  d.id === selected ? "bg-hyper-card" : ""
                }`}
              >
                {d.id}{" "}
                <span
                  className={`ml-1 text-sm ${
                    status === "ON"
                      ? "text-green-400"
                      : status === "OFF"
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  ({status})
                </span>{" "}
                <span className="text-xs text-hyper-secondaryText">
                  [{groupName}]
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Device Details */}
      <div className="flex-1 pl-6">
        {selected ? (
          <>
            <h2 className="text-xl font-bold mb-4">Device: {selected}</h2>

            <h3 className="font-semibold">Telemetry (last 20)</h3>
            <div className="max-h-64 overflow-y-auto border border-gray-700 rounded mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-hyper-dark text-hyper-secondaryText">
                    <th className="text-left px-2">Time</th>
                    <th className="text-left px-2">Em_data</th>
                  </tr>
                </thead>
                <tbody>
                  {telemetry.slice(0, 20).map(t => (
                    <tr key={t.id} className="border-t border-gray-700">
                      <td className="px-2">{t.ts}</td>
                      <td className="px-2">
                        {t.payload.Em_data || JSON.stringify(t.payload)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Commands */}
            <div className="space-x-2 mb-4">
              <button
                onClick={() => sendManual("ON")}
                className="bg-green-500 px-3 py-1 rounded"
              >
                Turn ON
              </button>
              <button
                onClick={() => sendManual("OFF")}
                className="bg-red-500 px-3 py-1 rounded"
              >
                Turn OFF
              </button>
            </div>

            <div className="mb-2">
              <button
                onClick={getConfig}
                className="bg-blue-500 px-3 py-1 rounded mr-2"
              >
                Get Config
              </button>
              <button
                onClick={() => setConfigText("")}
                className="bg-gray-500 px-3 py-1 rounded"
              >
                Clear
              </button>
            </div>
            <textarea
              rows={6}
              value={configText}
              onChange={e => setConfigText(e.target.value)}
              className="w-full bg-hyper-dark text-hyper-lightText p-2 rounded mb-2"
            />
            <div className="space-x-2">
              <button
                onClick={sendConfig}
                className="bg-hyper-primary text-hyper-dark px-3 py-1 rounded"
              >
                Send Config
              </button>
              <button
                onClick={sendDefaultEEPROM}
                className="bg-orange-500 px-3 py-1 rounded"
              >
                Default EEPROM
              </button>
            </div>
          </>
        ) : (
          <p>Select a device to view details</p>
        )}
      </div>
    </div>
  );
}

