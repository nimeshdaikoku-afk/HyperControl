import { useEffect, useState } from "react";
import axios from "axios";

const API_URL = "http://localhost:4000";

export default function Dashboard() {
  const [summary, setSummary] = useState({ total: 0, online: 0, offline: 0 });

  useEffect(() => {
    async function load() {
      const devices = await axios.get(`${API_URL}/api/devices`);
      const status = await axios.get(`${API_URL}/api/devices/status`);

      setSummary({
        total: devices.data.length,
        online: status.data.filter(s => s.led_status === "ON").length,
        offline: status.data.filter(s => s.led_status === "OFF").length,
      });
    }
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-hyper-primary">Dashboard Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card title="Total Devices" value={summary.total} />
        <Card title="Online" value={summary.online} color="text-green-400" />
        <Card title="Offline" value={summary.offline} color="text-red-400" />
      </div>
    </div>
  );
}

function Card({ title, value, color }) {
  return (
    <div className="bg-hyper-card p-6 rounded-lg">
      <div className="text-sm text-hyper-secondaryText">{title}</div>
      <div className={`text-2xl font-bold ${color || "text-hyper-lightText"}`}>{value}</div>
    </div>
  );
}

