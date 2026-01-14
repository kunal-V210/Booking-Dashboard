useEffect(() => {
  console.log("SCRIPT LOADED (REACT)");

  fetch("/bookings-analytics.json")
    .then(res => res.json())
    .then(data => {
      console.log("JSON DATA RECEIVED", data);
      setRawData(data);
    })
    .catch(err => console.error("FETCH ERROR", err));
}, []);
