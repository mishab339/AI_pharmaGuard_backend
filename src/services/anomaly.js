// Simple rule-based anomaly detection using distance and time thresholds.

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Minimal geocoder stub map. Replace with real geocoding or a city->coords map.
const CITY_COORDS = {
  Delhi: { lat: 28.6139, lon: 77.209 },
  Mumbai: { lat: 19.076, lon: 72.8777 },
  Bengaluru: { lat: 12.9716, lon: 77.5946 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
};

function coordsForCity(city) {
  return CITY_COORDS[city] || null;
}

function isAnomalous(history, newScan) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const newTime = Date.parse(newScan.timestamp);
  if (Number.isNaN(newTime)) return false;

  const newCoords = coordsForCity(newScan.location);
  if (!newCoords) return false;

  // thresholds
  const MAX_TIME_WINDOW_MIN = 60; // 1 hour
  const MIN_DISTANCE_KM = 300; // 300 km apart within 1 hour considered suspicious

  for (const h of history) {
    const histTime = Date.parse(h.timestamp);
    if (Number.isNaN(histTime)) continue;
    const minutes = Math.abs(newTime - histTime) / (1000 * 60);
    if (minutes <= MAX_TIME_WINDOW_MIN) {
      const histCoords = coordsForCity(h.location);
      if (!histCoords) continue;
      const distKm = haversineKm(newCoords.lat, newCoords.lon, histCoords.lat, histCoords.lon);
      if (distKm >= MIN_DISTANCE_KM) {
        return true;
      }
    }
  }
  return false;
}

module.exports = { isAnomalous };


