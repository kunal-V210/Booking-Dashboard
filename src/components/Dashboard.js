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
  const cityRef = useRef(null);
  const paymentRef = useRef(null);
  const monthRef = useRef(null);
  const mapInstance = useRef(null);
  const charts = useRef({});

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    fetch("/bookings-analytics.json")
      .then(res => res.json())
      .then(json => setData(json))
      .catch(err => console.error(err));
  }, []);

  /* ================= HELPERS ================= */
  const safeDocs = (cb) => {
    data.forEach(item =>
      item.documents?.forEach(doc => {
        if (selectedCity !== "ALL" && doc.city !== selectedCity) return;
        cb(doc);
      })
    );
  };

  const getCities = () => {
    const set = new Set();
    data.forEach(i => i.documents?.forEach(d => d.city && set.add(d.city)));
    return ["ALL", ...Array.from(set)];
  };

  /* ================= KPI CALCULATION ================= */
  const calculateSummary = () => {
    let totalOrders = 0;
    let profit = 0;
    let cancelled = 0;
    let rescheduled = 0;

    safeDocs(doc => {
      totalOrders++;

      if (doc.orderAmount) {
        profit += Number(doc.orderAmount);
      }

      if (doc.bookingStatus === "CANCELLED") cancelled++;
      if (doc.bookingStatus === "RESCHEDULED") rescheduled++;
    });

    setSummary({ totalOrders, profit, cancelled, rescheduled });
  };

  /* ================= CHART OPTIONS ================= */
  const commonLegend = {
    legend: {
      display: true,
      position: "bottom",
      labels: {
        color: "#e5e7eb",
        font: { size: 11 }
      }
    }
  };

  /* ================= CHARTS ================= */

  const drawYearChart = () => {
    charts.current.year?.destroy();
    const map = {};

    safeDocs(d => {
      const y = new Date(d?.dateTime?.$date).getFullYear();
      if (y) map[y] = (map[y] || 0) + 1;
    });

    charts.current.year = new Chart(yearRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(map),
        datasets: [{
          label: "Orders",
          data: Object.values(map),
          backgroundColor: "#38bdf8",
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: commonLegend
      }
    });
  };

  const drawStatusChart = () => {
    charts.current.status?.destroy();
    const map = {};

    safeDocs(d => {
      if (d.bookingStatus)
        map[d.bookingStatus] = (map[d.bookingStatus] || 0) + 1;
    });

    charts.current.status = new Chart(statusRef.current, {
      type: "doughnut",
      data: {
        labels: Object.keys(map),
        datasets: [{
          data: Object.values(map),
          backgroundColor: ["#22c55e", "#ef4444", "#facc15"]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: commonLegend
      }
    });
  };

  const drawTopCityChart = () => {
    charts.current.city?.destroy();
    const map = {};

    safeDocs(d => {
      if (d.city) map[d.city] = (map[d.city] || 0) + 1;
    });

    charts.current.city = new Chart(cityRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(map),
        datasets: [{
          data: Object.values(map),
          backgroundColor: "#818cf8",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: commonLegend
      }
    });
  };

  const drawPaymentChart = () => {
    charts.current.payment?.destroy();
    const map = {};

    safeDocs(d => {
      if (d.paymentMethod)
        map[d.paymentMethod] = (map[d.paymentMethod] || 0) + 1;
    });

    charts.current.payment = new Chart(paymentRef.current, {
      type: "bar",
      data: {
        labels: Object.keys(map),
        datasets: [{
          data: Object.values(map),
          backgroundColor: "#fb7185",
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: commonLegend
      }
    });
  };

  const drawMonthlyChart = () => {
    charts.current.month?.destroy();
    const map = {};

    safeDocs(d => {
      const dt = d?.dateTime?.$date;
      if (!dt) return;
      const key = new Date(dt).toLocaleString("en", {
        month: "short",
        year: "numeric"
      });
      map[key] = (map[key] || 0) + 1;
    });

    charts.current.month = new Chart(monthRef.current, {
      type: "line",
      data: {
        labels: Object.keys(map),
        datasets: [{
          label: "Orders",
          data: Object.values(map),
          borderColor: "#22d3ee",
          tension: 0.4,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: commonLegend
      }
    });
  };

  const drawMap = () => {
  if (!document.getElementById("map")) return;

  if (mapInstance.current) {
    mapInstance.current.remove();
    mapInstance.current = null;
  }

  mapInstance.current = L.map("map", {
    scrollWheelZoom: false,
    dragging: !L.Browser.mobile
  }).setView([22.5, 78.9], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: ""
  }).addTo(mapInstance.current);

  const cityCount = {};
  safeDocs(d => {
    if (d.city) cityCount[d.city] = (cityCount[d.city] || 0) + 1;
  });

  Object.entries(cityCount).forEach(([city, count]) => {
    if (!cityLatLng[city]) return;
    L.circleMarker(cityLatLng[city], {
      radius: Math.sqrt(count) * 3,
      color: "#38bdf8",
      fillOpacity: 0.7
    })
      .addTo(mapInstance.current)
      .bindTooltip(`${city}: ${count}`);
  });
};


  /* ================= UPDATE DASHBOARD ================= */
  useEffect(() => {
    if (!data.length) return;
    calculateSummary();
    drawYearChart();
    drawStatusChart();
    drawTopCityChart();
    drawPaymentChart();
    drawMonthlyChart();
    drawMap();
  }, [data, selectedCity]);

  /* ================= JSX ================= */
  return (
    <div className="dashboard">

      {/* KPI + FILTER */}
      <div className="kpiGrid">
        <div className="kpiCard">
          <h4>Total Orders</h4>
          <p>{summary.totalOrders}</p>
        </div>

        <div className="kpiCard">
          <h4>Total Profit</h4>
          <p>₹ {summary.profit.toLocaleString()}</p>
        </div>

        <div className="kpiCard">
          <h4>Cancelled</h4>
          <p>{summary.cancelled}</p>
        </div>

        <div className="kpiCard filterCard">
          <h4>Filter by City</h4>
          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)}>
            {getCities().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ROW 2 */}
      <div className="gridRow2">
        <div className="card large">
          <h3>Monthly Orders</h3>
          <canvas ref={monthRef} />
        </div>

        <div className="card small">
          <h3>Payment Method</h3>
          <canvas ref={paymentRef} />
        </div>
      </div>

      {/* ROW 3 */}
      <div className="gridRow3">
        <div className="card">
          <h3>Booking Status</h3>
          <canvas ref={statusRef} />
        </div>

        <div className="card">
          <h3>Orders by Year</h3>
          <canvas ref={yearRef} />
        </div>

        <div className="card mapCard">
          <h3>Geography Based Traffic</h3>
          <div id="map"></div>
        </div>
      </div>

    </div>
  );
}
