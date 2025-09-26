import { useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:4000";

export default function CommissionPage() {
  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [groupId, setGroupId] = useState("");

  const commission = () => {
    if (!deviceId) return alert("Enter device ID");

    axios.post(`${API_URL}/api/devices/commission`, {
      device_id: deviceId,
      latitude: parseFloat(lat) || null,
      longitude: parseFloat(lng) || null,
      group_id: groupId || null
    }).then(res => {
      alert(`Commissioned. Token: ${res.data.token}`);
      setDeviceId(""); setLat(""); setLng(""); setGroupId("");
    }).catch(err => alert("Error commissioning device: " + err.message));
  };

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-hyper-primary mb-4">Commission Device</h1>
      <div className="bg-hyper-card p-6 rounded-lg space-y-3">
        <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Device ID" className="w-full bg-hyper-dark p-2 rounded" />
        <div className="flex gap-3">
          <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude" className="flex-1 bg-hyper-dark p-2 rounded" />
          <input value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude" className="flex-1 bg-hyper-dark p-2 rounded" />
        </div>
        <input value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Group ID (optional)" className="w-full bg-hyper-dark p-2 rounded" />
        <button onClick={commission} className="bg-hyper-primary text-hyper-dark px-4 py-2 rounded w-full">Commission</button>
      </div>
    </div>
  );
}

