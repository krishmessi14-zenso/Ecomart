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
  if (lat === undefined || lng === undefined || lat === null || lng === null) return null;

  // 1. Try Backend API service
  try {
    const res = await fetch(`/api/locations/reverse-geocode?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.placeName && data.placeName !== "Kovilpatti") {
        return data;
      }
      if (data && data.placeName) {
        return data;
      }
    }
  } catch (err) {
    console.warn("Backend reverse geocode failed:", err.message);
  }

  // 2. Client-side OpenStreetMap Nominatim reverse geocoding fallback
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        const addr = data.address;
        const countryCode = (addr.country_code || "IN").toUpperCase();
        const countryName = addr.country || "India";
        const regionName = addr.state || addr.region || addr.province || addr.state_district || "";
        const districtName = addr.district || addr.state_district || addr.county || addr.city_district || addr.city || "";
        const placeName = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || addr.county || "Detected Location";

        return {
          placeName,
          formattedAddress: data.display_name || `${placeName}, ${regionName}, ${countryName}`,
          countryCode,
          countryName,
          regionName,
          districtName,
          latitude: lat,
          longitude: lng
        };
      }
    }
  } catch (e) {
    console.warn("Client Nominatim geocode error:", e.message);
  }

  // 3. Client-side BigDataCloud reverse geocoding fallback
  try {
    const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        const countryCode = (data.countryCode || "IN").toUpperCase();
        const countryName = data.countryName || "India";
        const regionName = data.principalSubdivision || "";
        const districtName = data.locality || data.city || "";
        const placeName = data.locality || data.city || data.localityInfo?.informative?.[0]?.name || "Detected Location";

        return {
          placeName,
          formattedAddress: `${placeName}, ${regionName}, ${countryName}`,
          countryCode,
          countryName,
          regionName,
          districtName,
          latitude: lat,
          longitude: lng
        };
      }
    }
  } catch (err) {
    console.warn("Reverse geocoding error:", err.message);
  }

  return null;
}
