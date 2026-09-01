/**
 * EcoMart Global Location Frontend Service
 * Centralized API wrapper communicating with EcoMart backend location service
 */

export async function fetchCountries() {
  try {
    const res = await fetch("/api/locations/countries");
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Failed to fetch countries:", err.message);
  }
  return [
    { code: "IN", name: "India", flag: "🇮🇳", currency: "INR", symbol: "₹", adminTerm: "State", districtTerm: "District" },
    { code: "US", name: "United States", flag: "🇺🇸", currency: "USD", symbol: "$", adminTerm: "State", districtTerm: "County" },
    { code: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD", symbol: "CA$", adminTerm: "Province", districtTerm: "District" },
    { code: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP", symbol: "£", adminTerm: "Country", districtTerm: "County" },
    { code: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD", symbol: "A$", adminTerm: "State", districtTerm: "LGA" }
  ];
}

export async function fetchRegions(countryCode) {
  if (!countryCode) return [];
  try {
    const res = await fetch(`/api/locations/regions/${encodeURIComponent(countryCode)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch regions for ${countryCode}:`, err.message);
  }
  return [];
}

export async function fetchDistricts(countryCode, regionCode) {
  if (!countryCode || !regionCode) return [];
  try {
    const res = await fetch(`/api/locations/districts/${encodeURIComponent(countryCode)}/${encodeURIComponent(regionCode)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch districts for ${countryCode}-${regionCode}:`, err.message);
  }
  return [];
}

export async function fetchPlaces(countryCode, regionCode, districtCode) {
  if (!countryCode || !regionCode || !districtCode) return [];
  try {
    const res = await fetch(`/api/locations/places/${encodeURIComponent(countryCode)}/${encodeURIComponent(regionCode)}/${encodeURIComponent(districtCode)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`Failed to fetch places for ${countryCode}-${regionCode}-${districtCode}:`, err.message);
  }
  return [];
}

export async function searchLocations(query, countryCode = "") {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch(`/api/locations/search?q=${encodeURIComponent(query)}&countryCode=${encodeURIComponent(countryCode)}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Location search failed:", err.message);
  }
  return [];
}

export async function reverseGeocodeLocation(lat, lng) {
  if (!lat || !lng) return null;
  try {
    const res = await fetch(`/api/locations/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Reverse geocode failed:", err.message);
  }
  return null;
}
