import React, { useEffect, useRef, useState } from "react";
import Chart from "chart.js/auto";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../App.css";

/* CITY COORDINATES */
const cityLatLng = {
  Mumbai: [19.076, 72.8777],
  Delhi: [28.7041, 77.1025],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Hyderabad: [17.385, 78.4867],
};

export default function Dashboard() {
  const [data, setData] = useState([]);
  const [selectedCity, setSelectedCity] = useState("ALL");

  const yearRef = useRef();
  const statusRef = useRef();
  const paymentRef = useRef();
  const monthRef = useRef();
  const mapRef = useRef(null);
  const charts = useRef({});

  /* ================= FETCH JSON ================= */
  useEffect(() => {
    fetch(process.env.PUBLIC_URL + "/bookings-analytics.json")
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error("JSON error:", err));
  }, []);

  /* ================= DASHBOARD LOGIC ================= */
  useEffect(() => {
    if (!data.length) return;

    const docs = [];
    data.forEach(i =>
      i.documents?.forEach(d => {
        if (selectedCity === "ALL" || d.city === selectedCity) docs.push(d);
      })
    );

    /* DESTROY OLD CHARTS */
    Object.values(charts.current).forEach(c => c?.destroy());

    /* ===== YEAR ===== */
    const yearMap = {};
    docs.forEach(d => {
      const y = new Date(d.dateTime?.$date).getFullYear();
      if (y) yearMap[y] = (yearMap[y] || 0) + 1;
    });

    charts.current.year = new Chart(yearRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(yearMap),
        datasets: [{ data: Object.values(yearMap), backgroundColor: "#38bdf8" }]
      }
    });

    /* ===== STATUS ===== */
    const statusMap = {};
    docs.forEach(d => {
      if (d.bookingStatus)
        statusMap[d.bookingStatus] = (statusMap[d.bookingStatus] || 0) + 1;
    });

    charts.current.status = new Chart(statusRef.current, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusMap),
        datasets: [{ data: Object.values(statusMap) }]
      }
    });

    /* ===== PAYMENT ===== */
    const payMap = {};
    docs.forEach(d => {
      if (d.paymentMethod)
        payMap[d.paymentMethod] = (payMap[d.paymentMethod] || 0) + 1;
    });

    charts.current.payment = new Chart(paymentRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(payMap),
        datasets: [{ data: Object.values(payMap), backgroundColor: "#fb7185" }]
      }
    });

    /* ===== MONTH ===== */
    const monthMap = {};
    docs.forEach(d => {
      const dt = d.dateTime?.$date;
      if (!dt) return;
      const key = new Date(dt).toLocaleString("en", { month: "short", year: "numeric" });
      monthMap[key] = (monthMap[key] || 0) + 1;
    });

    charts.current.month = new Chart(monthRef.current, {
      type: "line",
      data: {
        labels: Object.keys(monthMap),
        datasets: [{ data: Object.values(monthMap), borderColor: "#22d3ee" }]
      }
    });

    /* ===== MAP ===== */
    if (mapRef.current) {
      mapRef.current.remove();
    }

    mapRef.current = L.map("map").setView([22.5, 78.9], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapRef.current);

    Object.entries(payMap).forEach(([city, count]) => {
      if (!cityLatLng[city]) return;
      L.circleMarker(cityLatLng[city], {
        radius: Math.sqrt(count) * 4,
        color: "#38bdf8",
        fillOpacity: 0.6
      })
        .addTo(mapRef.current)
        .bindTooltip(`${city}: ${count}`);
    });

  }, [data, selectedCity]);

  const cities = ["ALL", ...new Set(data.flatMap(i => i.documents?.map(d => d.city)))];

  return (
    <div className="dashboard">

      <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
        {cities.map(c => <option key={c}>{c}</option>)}
      </select>

      <canvas ref={monthRef} />
      <canvas ref={paymentRef} />
      <canvas ref={statusRef} />
      <canvas ref={yearRef} />

      <div id="map" style={{ height: "350px", marginTop: "20px" }} />

    </div>
  );
}
