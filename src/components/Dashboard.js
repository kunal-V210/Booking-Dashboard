import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

/* ================= CITY COORDINATES ================= */
const cityLatLng = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.7041, 77.1025],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Hyderabad: [17.385, 78.4867],
};

export default function Dashboard() {
  /* ================= STATE ================= */
  const [data, setData] = useState([]);
  const [selectedCity, setSelectedCity] = useState("ALL");
  const [summary, setSummary] = useState({
    totalOrders: 0,
    profit: 0,
    cancelled: 0,
    rescheduled: 0,
  });

  /* ================= REFS ================= */
  const yearRef = useRef(null);
  const statusRef = useRef(null);
  const paymentRef = useRef(null);
  const monthRef = useRef(null);
  const mapRef = useRef(null);
  const charts = useRef({});
  const mapInstance = useRef(null);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/bookings-analytics.json")
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => console.error("JSON error:", err));
  }, []);

  /* ================= DASHBOARD LOGIC ================= */
  useEffect(() => {
    if (!data.length) return;

    /* SAFE DOC ITERATOR */
    const safeDocs = (cb) => {
      data.forEach((item) =>
        item.documents?.forEach((doc) => {
          if (selectedCity !== "ALL" && doc.city !== selectedCity) return;
          cb(doc);
        })
      );
    };

    /* ================= KPI ================= */
    let totalOrders = 0;
    let profit = 0;
    let cancelled = 0;
    let rescheduled = 0;

    safeDocs((doc) => {
      totalOrders++;
      if (doc.orderAmount) profit += Number(doc.orderAmount);
      if (doc.bookingStatus === "CANCELLED") cancelled++;
      if (doc.bookingStatus === "RESCHEDULED") rescheduled++;
    });

    setSummary({ totalOrders, profit, cancelled, rescheduled });

    /* ================= COMMON OPTIONS ================= */
    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#e5e7eb", font: { size: 11 } },
        },
      },
    };

    /* ================= YEAR CHART ================= */
    charts.current.year?.destroy();
    const yearMap = {};
    safeDocs((d) => {
      const y = new Date(d?.dateTime?.$date).getFullYear();
      if (y) yearMap[y] = (yearMap[y] || 0) + 1;
    });

    charts.current.year = new Chart(yearRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(yearMap),
        datasets: [
          {
            label: "Orders",
            data: Object.values(yearMap),
            backgroundColor: "#38bdf8",
            borderRadius: 6,
          },
        ],
      },
      options,
    });

    /* ================= STATUS CHART ================= */
    charts.current.status?.destroy();
    const statusMap = {};
    safeDocs((d) => {
      if (d.bookingStatus)
        statusMap[d.bookingStatus] =
          (statusMap[d.bookingStatus] || 0) + 1;
    });

    charts.current.status = new Chart(statusRef.current, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusMap),
        datasets: [
          {
            data: Object.values(statusMap),
            backgroundColor: ["#22c55e", "#ef4444", "#facc15"],
          },
        ],
      },
      options,
    });

    /* ================= PAYMENT CHART ================= */
    charts.current.payment?.destroy();
    const payMap = {};
    safeDocs((d) => {
      if (d.paymentMethod)
        payMap[d.paymentMethod] = (payMap[d.paymentMethod] || 0) + 1;
    });

    charts.current.payment = new Chart(paymentRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(payMap),
        datasets: [
          {
            data: Object.values(payMap),
            backgroundColor: "#fb7185",
          },
        ],
      },
      options,
    });

    /* ================= MONTH CHART ================= */
    charts.current.month?.destroy();
    const monthMap = {};
    safeDocs((d) => {
      const dt = d?.dateTime?.$date;
      if (!dt) return;
      const key = new Date(dt).toLocaleString("en", {
        month: "short",
        year: "numeric",
      });
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    charts.current.month = new Chart(monthRef.current, {
      type: "line",
      data: {
        labels: Object.keys(monthMap),
        datasets: [
          {
            label: "Orders",
            data: Object.values(monthMap),
            borderColor: "#22d3ee",
            tension: 0.4,
          },
        ],
      },
      options,
    });

    /* ================= MAP ================= */
    if (!mapRef.current) return;

    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    mapInstance.current = L.map(mapRef.current).setView([22.5, 78.9], 5);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      mapInstance.current
    );

    Object.entries(yearMap).forEach(([city, count]) => {
      if (!cityLatLng[city]) return;
      L.circleMarker(cityLatLng[city], {
        radius: Math.sqrt(count) * 3,
        color: "#38bdf8",
        fillOpacity: 0.7,
      }).addTo(mapInstance.current);
    });
  }, [data, selectedCity]);

  /* ================= CITIES ================= */
  const cities = ["ALL", ...new Set(
    data.flatMap((i) => i.documents?.map((d) => d.city)).filter(Boolean)
  )];

  /* ================= JSX ================= */
  return (
    <div className="dashboard">
      {/* KPI */}
      <div className="kpiGrid">
        <div className="kpiCard">Orders: {summary.totalOrders}</div>
        <div className="kpiCard">Profit: ₹{summary.profit}</div>
        <div className="kpiCard">Cancelled: {summary.cancelled}</div>
        <div className="kpiCard">
          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)}>
            {cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CHARTS */}
      <canvas ref={monthRef} />
      <canvas ref={paymentRef} />
      <canvas ref={statusRef} />
      <canvas ref={yearRef} />

      {/* MAP */}
      <div ref={mapRef} style={{ height: "400px" }} />
    </div>
  );
}
