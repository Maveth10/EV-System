import * as turf from '@turf/turf';

/**
 * FIX DLA BAZY DANYCH (SUPABASE/POSTGIS)
 * Wymusza format MultiPolygon, aby uniknąć błędu "not sufficiently nested"
 */
export const ensureMultiPolygon = (geometry: any) => {
  if (!geometry) return null;
  if (geometry.type === 'Polygon') {
    return {
      type: 'MultiPolygon',
      coordinates: [geometry.coordinates]
    };
  }
  return geometry; // Jeśli to już jest MultiPolygon, zwracamy bez zmian
};

/**
 * Scala tablicę regionów w jeden wielki poligon.
 */
export const mergeRegions = (features: any[]) => {
  if (!features || features.length === 0) return null;
  
  let finalPolygon = features[0];
  try {
    for (let i = 1; i < features.length; i++) {
      // Kompatybilność z nowym Turf.js v7
      const merged = turf.union(turf.featureCollection([finalPolygon, features[i]]));
      if (merged) finalPolygon = merged;
    }
    return finalPolygon;
  } catch (error) {
    console.warn("Błąd łączenia regionów:", error);
    return features[0];
  }
};

export const buildOuterBoundary = (featureCollection: any) => {
  if (!featureCollection || !featureCollection.features) return null;
  return mergeRegions(featureCollection.features);
};

/**
 * AUTO-KLIPOWANIE (Snapping by Intersection)
 * Docina narysowany przez użytkownika kształt do granic dozwolonego obszaru.
 */
export const clipToBoundary = (drawnFeature: any, boundaryFeature: any) => {
  if (!drawnFeature || !boundaryFeature) return drawnFeature;

  try {
    // Bezpieczne klipowanie dostosowane do Turf v7
    const clipped = turf.intersect(turf.featureCollection([drawnFeature, boundaryFeature]));
    
    if (clipped) {
      return clipped;
    } else {
      alert('Narysowany kształt znajduje się całkowicie poza granicami obszaru operacyjnego!');
      return null;
    }
  } catch (error) {
    console.warn("Klipowanie nie powiodło się, zwracam oryginalny kształt.", error);
    return drawnFeature; 
  }
};