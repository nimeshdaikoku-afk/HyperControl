import { useState } from "react";
import axios from "axios";
const API_URL = "http://localhost:4000";

export default function CommissionPage() {
  const [deviceId, setDeviceId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [groupId, setGroupId] = useState("");
  const [result, setResult] = useState(null);

  const commission = () => {
    axios.post(`${API_URL}/api/devices/commission`, {
      device_id: deviceId,
      latitude: lat || null,
      longitude: lng || null,
      group_id: groupId || null
    }).then(r => setResult(r.data));
  };

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-bold text-hyper-primary">Commission Device</h1>
      <input value={deviceId} onChange={e => setDeviceId(e.target.value)} placeholder="Device ID"
        className="w-full bg-hyper-dark p-2 rounded" />
      <div className="flex gap-3">
        <input value={lat} onChange={e => setLat(e.target.value)} placeholder="Latitude"
          className="flex-1 bg-hyper-dark p-2 rounded" />
        <input value={lng} onChange={e => setLng(e.target.value)} placeholder="Longitude"
          className="flex-1 bg-hyper-dark p-2 rounded" />
      </div>
      <input value={groupId} onChange={e => setGroupId(e.target.value)} placeholder="Group ID"
        className="w-full bg-hyper-dark p-2 rounded" />
      <button onClick={commission} className="bg-hyper-primary text-black px-4 py-2 rounded w-full">Commission</button>

      {result && (
        <div className="bg-hyper-card p-4 rounded text-xs mt-4">
          Device: {result.device_id} <br />
          Token: {result.token} <br />
          Group: {result.group_id}
        </div>
      )}
    </div>
  );
}

