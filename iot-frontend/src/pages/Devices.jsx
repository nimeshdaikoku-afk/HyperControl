import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:4000";

export default function Devices() {
  const [devices, setDevices] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [selected, setSelected] = useState(null);
  const [telemetry, setTelemetry] = useState([]);
  const [config, setConfig] = useState("");

  useEffect(() => {
    async function load() {
      const d = await axios.get(`${API_URL}/api/devices`);
      const s = await axios.get(`${API_URL}/api/devices/status`);
      const map = {};
      s.data.forEach(x => (map[x.device_id] = x.led_status));
      setDevices(d.data);
      setStatusMap(map);
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (selected) {
      axios.get(`${API_URL}/api/devices/${selected}/telemetry`)
        .then(r => setTelemetry(r.data));
      axios.get(`${API_URL}/api/devices/${selected}/config`)
        .then(r => setConfig(JSON.stringify(r.data, null, 2)));
    }
  }, [selected]);

  const sendManual = (state) => {
    axios.post(`${API_URL}/api/devices/${selected}/command`, {
      cmd: "manual", data: { lightOn: state }
    });
  };

  const sendConfig = () => {
    let obj;
    try { obj = JSON.parse(config); } catch { return alert("Invalid JSON"); }
    axios.post(`${API_URL}/api/devices/${selected}/command`, {
      cmd: "configdata", data: obj
    });
  };

  return (
    <div className="flex gap-6">
      {/* Device list */}
      <div className="w-64 bg-hyper-card rounded-lg p-4">
        <h2 className="font-bold mb-2">Devices</h2>
        <ul className="space-y-2">
          {devices.map(d => {
            const status = statusMap[d.id] || "UNKNOWN";
            return (
              <li key={d.id}
                className={`cursor-pointer ${selected === d.id ? "text-hyper-primary" : ""}`}
                onClick={() => setSelected(d.id)}>
                {d.id} <span className={
                  status === "ON" ? "text-green-400" :
                  status === "OFF" ? "text-red-400" : "text-yellow-400"
                }>({status})</span>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Details */}
      <div className="flex-1 bg-hyper-card rounded-lg p-4">
        {selected ? (
          <>
            <h2 className="text-xl font-bold mb-4">Device: {selected}</h2>
            <h3 className="font-semibold">Telemetry</h3>
            <pre className="bg-hyper-dark p-2 rounded h-40 overflow-y-auto text-xs">
              {telemetry.map(t => JSON.stringify(t.payload)).join("\n")}
            </pre>

            <h3 className="font-semibold mt-4">Manual Control</h3>
            <button onClick={() => sendManual("ON")} className="bg-green-600 px-3 py-1 rounded mr-2">ON</button>
            <button onClick={() => sendManual("OFF")} className="bg-red-600 px-3 py-1 rounded">OFF</button>

            <h3 className="font-semibold mt-4">Config</h3>
            <textarea value={config} onChange={e => setConfig(e.target.value)}
              className="w-full h-32 bg-hyper-dark p-2 rounded text-xs"></textarea>
            <button onClick={sendConfig} className="bg-hyper-primary text-black px-3 py-1 mt-2 rounded">Send Config</button>
          </>
        ) : <p>Select a device</p>}
      </div>
    </div>
  );
}

