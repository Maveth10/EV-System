'use client';
import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
import { supabase } from '../app/supabase';

import StationPanel, { Station } from './StationPanel';
import ContextMenu, { ContextMenuState } from './ContextMenu';
import AddStationModal from './AddStationModal';
import SectorEditor, { Sector } from './SectorEditor';
import Sidebar, { ViewState } from './Sidebar';
import StationsDatabase from './StationsDatabase';
import TechniciansDatabase from './TechniciansDatabase';
import TicketsDatabase from './TicketsDatabase';
import CalendarView from './CalendarView';
import { LoadingScreen } from './EkoenLogo';
import EquipmentManager from './EquipmentManager';
import ClientsDatabase from './ClientsDatabase';
import AnalyticsDashboard from './AnalyticsDashboard';

import { buildOuterBoundary, mergeRegions, clipToBoundary, ensureMultiPolygon } from '../utils/geometryEngine';

// ZAKTUALIZOWANE ŹRÓDŁA DO ODCHUDZONYCH PLIKÓW GEOJSON
const COUNTRY_SOURCES = [
  { url: '/poland.geojson', code: 'PL' },
  { url: '/slovakia.geojson', code: 'SK' }
];

const IconFilter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconRoute = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconLayers = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;

export default function ChargeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [activeView, setActiveView] = useState<ViewState>('map');
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLatLng, setModalLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [isSectorEditorOpen, setIsSectorEditorOpen] = useState(false);
  const [editingStationMap, setEditingStationMap] = useState<Station | null>(null);
  
  const [savedSectorsList, setSavedSectorsList] = useState<Sector[]>([]);
  const [savedRegionsList, setSavedRegionsList] = useState<Sector[]>([]);
  const [allStations, setAllStations] = useState<Station[]>([]);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isRouteMenuOpen, setIsRouteMenuOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<HTMLDivElement>(null);

  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  
  // ZAPALNIK DO ODŚWIEŻANIA TABELI
  const [refreshDataTrigger, setRefreshDataTrigger] = useState(0);

  const [filters, setFilters] = useState({
    client: '', technician: '', model: '', status: '', dateFrom: '', dateTo: ''
  });

  const [routeTechId, setRouteTechId] = useState('');
  const [isRouting, setIsRouting] = useState(false);

  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const isDrawingActiveRef = useRef(false);

  const [drawMethod, setDrawMethod] = useState<'manual' | 'click'>('manual');
  const drawMethodRef = useRef<'manual' | 'click'>('manual');

  const regionsGeoJsonRef = useRef<any>(null);
  const masterBoundaryRef = useRef<any>(null); 
  const selectedRegionIds = useRef<Set<number>>(new Set());

  const [showSectors, setShowSectors] = useState(false);
  const showSectorsRef = useRef(false);

  const [activeDrawContext, setActiveDrawContext] = useState<{
    mode: 'insert' | 'append' | 'update'; techName: string; color: string; sectorId?: string; targetType: 'technician' | 'region';
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFilterOpen(false);
        setIsRouteMenuOpen(false);
        setContextMenu(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
      if (routeRef.current && !routeRef.current.contains(e.target as Node)) {
        setIsRouteMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const setDrawingState = (isActive: boolean) => {
    setIsDrawingActive(isActive);
    isDrawingActiveRef.current = isActive;
  };

  const handleSetDrawMethod = (method: 'manual' | 'click', forceMode?: string, forceOptions?: any) => {
    setDrawMethod(method);
    drawMethodRef.current = method;
    if (!drawRef.current) return;
    if (forceMode) drawRef.current.changeMode(forceMode as any, forceOptions);
    else if (method === 'manual') drawRef.current.changeMode('draw_polygon');
    else drawRef.current.changeMode('simple_select');
  };

  const toggleSectorsVisibility = (forceShow?: boolean) => {
    const newState = forceShow !== undefined ? forceShow : !showSectors;
    setShowSectors(newState);
    showSectorsRef.current = newState;
    if (map.current) {
      ['saved-sectors-layer', 'saved-sectors-outline', 'saved-regions-layer', 'saved-regions-outline'].forEach(layer => {
        if (map.current!.getLayer(layer)) map.current!.setLayoutProperty(layer, 'visibility', newState ? 'visible' : 'none');
      });
    }
  };

  const loadStations = useCallback(async () => {
    const { data } = await supabase.from('stations').select('*');
    if (data) setAllStations(data as Station[]);
  }, []);

  // --- POPRAWKA: BEZPOŚREDNIE POBIERANIE DANYCH Z BAZY + ODPORNY PARSER JSON ---
  const loadSavedSectors = useCallback(async () => {
    try {
      const [techs, regs] = await Promise.all([
        supabase.from('technicians').select('id, name, color, zone_geometry'),
        supabase.from('regions').select('id, name, color, zone_geometry')
      ]);

      const parseGeom = (g: any) => {
        if (!g) return null;
        if (typeof g === 'string') {
          try { return JSON.parse(g); } catch(e) { return null; }
        }
        return g;
      };

      if (techs.data) {
        const mappedTechs = techs.data.map(d => ({ id: d.id, name: d.name, color: d.color, geometry: parseGeom(d.zone_geometry) }));
        setSavedSectorsList(mappedTechs);
        if (map.current?.getSource('saved-sectors')) {
          const features = mappedTechs.filter(t => t.geometry).map(t => ({ type: 'Feature', geometry: t.geometry, properties: { id: t.id, name: t.name, color: t.color }}));
          (map.current.getSource('saved-sectors') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features } as any);
        }
      }

      if (regs.data) {
        const mappedRegs = regs.data.map(d => ({ id: d.id, name: d.name, color: d.color, geometry: parseGeom(d.zone_geometry) }));
        setSavedRegionsList(mappedRegs);
        if (map.current?.getSource('saved-regions')) {
          const features = mappedRegs.filter(r => r.geometry).map(r => ({ type: 'Feature', geometry: r.geometry, properties: { id: r.id, name: r.name, color: r.color }}));
          (map.current.getSource('saved-regions') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features } as any);
        }
      }
    } catch (err) {
      console.error('Błąd ładowania stref:', err);
    }
  }, []);

  useEffect(() => {
    if (activeView === 'map' && map.current) {
      loadStations();
      loadSavedSectors();
    }
  }, [activeView, loadStations, loadSavedSectors]);

  useEffect(() => {
    if (!mapContainer.current || map.current) return; 

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [19.14, 51.91], zoom: 5.5, pitch: 0, dragRotate: false, doubleClickZoom: false,
    });

    drawRef.current = new MapboxDraw({ displayControlsDefault: false, controls: { polygon: false, trash: false }});
    map.current.addControl(drawRef.current as any);

    map.current.on('load', async () => {
      if (!map.current) return;

      map.current.on('contextmenu', (e) => {
        e.preventDefault(); 
        setContextMenu({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat });
      });
      map.current.on('click', () => setContextMenu(null));

      map.current.addSource('optimized-route', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      map.current.addLayer({
        id: 'optimized-route-line-glow',
        type: 'line',
        source: 'optimized-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#3b82f6', 'line-width': 10, 'line-opacity': 0.3 }
      });

      map.current.addLayer({
        id: 'optimized-route-line',
        type: 'line',
        source: 'optimized-route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-dasharray': [2, 2] }
      });

      map.current.addSource('stations-data', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'stations-data',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#58b347',
          'circle-opacity': 0.9,
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            18, 10, 22, 50, 28
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.8)'
        }
      });

      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stations-data',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['Arial Unicode MS Bold'],
          'text-size': 14
        },
        paint: { 'text-color': '#ffffff' }
      });

      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'stations-data',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 7,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
          'circle-color': [
            'match',
            ['get', 'status'],
            'Awaria', '#ef4444',
            'Uruchomienie', '#8b5cf6',
            'Przegląd', '#3b82f6',
            'Zlecenie jakościowe', '#f97316',
            'Naprawa odpłatna', '#eab308',
            '#58b347'
          ]
        }
      });

      map.current.on('click', 'clusters', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0].properties.cluster_id;
        (map.current!.getSource('stations-data') as maplibregl.GeoJSONSource)
          .getClusterExpansionZoom(clusterId)
          .then((zoom) => {
            map.current!.easeTo({
              center: (features[0].geometry as any).coordinates,
              zoom: zoom
            });
          })
          .catch((err) => console.error("Error expanding cluster:", err));
      });

      map.current.on('click', 'unclustered-point', (e) => {
        const properties = e.features![0].properties;
        try {
          const stationData = JSON.parse(properties.station_data);
          setSelectedStation(stationData);
          setContextMenu(null);
        } catch(err) {}
      });

      map.current.on('mouseenter', 'clusters', () => { map.current!.getCanvas().style.cursor = 'pointer'; });
      map.current.on('mouseleave', 'clusters', () => { map.current!.getCanvas().style.cursor = ''; });
      map.current.on('mouseenter', 'unclustered-point', () => { map.current!.getCanvas().style.cursor = 'pointer'; });
      map.current.on('mouseleave', 'unclustered-point', () => { map.current!.getCanvas().style.cursor = ''; });

      map.current.addSource('saved-regions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: 'saved-regions-layer', type: 'fill', source: 'saved-regions', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 } });
      map.current.addLayer({ id: 'saved-regions-outline', type: 'line', source: 'saved-regions', layout: { visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] } });

      map.current.addSource('saved-sectors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: 'saved-sectors-layer', type: 'fill', source: 'saved-sectors', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 } });
      map.current.addLayer({ id: 'saved-sectors-outline', type: 'line', source: 'saved-sectors', layout: { visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });

      try {
        const responses = await Promise.all(
          COUNTRY_SOURCES.map(src => fetch(src.url).then(res => res.json()).then(data => ({ code: src.code, data })))
        );
        
        const combinedFeatures: any[] = [];
        const boundaryFeatures: any[] = [];
        let globalId = 1;
        let boundaryId = 9000;

        responses.forEach(({ code, data }) => {
          if (data && data.features) {
            data.features.forEach((f: any) => {
              combinedFeatures.push({
                ...f,
                id: globalId,
                properties: { ...f.properties, customId: globalId, countryCode: code }
              });
              globalId++;
            });

            const outerPolygon = buildOuterBoundary(data) || data.features[0];
            outerPolygon.id = boundaryId;
            outerPolygon.properties = { ...outerPolygon.properties, customId: boundaryId, countryCode: code, isBoundary: true };
            boundaryFeatures.push(outerPolygon);
            boundaryId++;
          }
        });

        const combinedGeoJson = { type: 'FeatureCollection' as const, features: combinedFeatures };
        const boundariesGeoJson = { type: 'FeatureCollection' as const, features: boundaryFeatures };

        regionsGeoJsonRef.current = combinedGeoJson;
        masterBoundaryRef.current = buildOuterBoundary(combinedGeoJson) || combinedGeoJson.features[0];

        map.current.addSource('regions-data', { type: 'geojson', data: combinedGeoJson as any, promoteId: 'customId' });
        map.current.addSource('boundaries-data', { type: 'geojson', data: boundariesGeoJson as any, promoteId: 'customId' });
        
        map.current.addLayer({ 
          id: 'regions-fill', type: 'fill', source: 'regions-data', 
          paint: { 
            'fill-color': '#58b347', 
            'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.6, ['boolean', ['feature-state', 'hover'], false], 0.2, 0.02] 
          }
        });
        map.current.addLayer({ id: 'regions-outline', type: 'line', source: 'regions-data', paint: { 'line-color': '#cbd5e1', 'line-width': 1, 'line-dasharray': [3, 3] }});

        map.current.addLayer({ id: 'boundaries-hitbox', type: 'line', source: 'boundaries-data', paint: { 'line-width': 20, 'line-color': 'transparent' }});
        map.current.addLayer({ id: 'boundaries-glow', type: 'line', source: 'boundaries-data', paint: { 'line-width': 4, 'line-color': '#58b347', 'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0] }});

        let hoveredStateId: number | null = null;
        let hoveredBoundaryId: number | null = null;

        map.current.on('mousemove', 'regions-fill', (e) => {
          if (isDrawingActiveRef.current && drawMethodRef.current === 'click' && e.features && e.features.length > 0) {
            map.current!.getCanvas().style.cursor = 'crosshair';
            const fId = e.features[0].properties.customId as number;
            
            if (hoveredStateId !== null && hoveredStateId !== fId) {
              map.current!.setFeatureState({ source: 'regions-data', id: hoveredStateId as number }, { hover: false });
            }
            hoveredStateId = fId;
            map.current!.setFeatureState({ source: 'regions-data', id: fId }, { hover: true });
          }
        });
        
        map.current.on('mouseleave', 'regions-fill', () => {
          if (hoveredStateId !== null) {
            map.current!.setFeatureState({ source: 'regions-data', id: hoveredStateId as number }, { hover: false });
            hoveredStateId = null;
          }
          map.current!.getCanvas().style.cursor = '';
        });

        map.current.on('click', 'regions-fill', (e) => {
          if (!isDrawingActiveRef.current || drawMethodRef.current !== 'click') return;
          if (e.features && e.features.length > 0) {
            const id = e.features[0].properties.customId as number;
            if (selectedRegionIds.current.has(id)) {
              selectedRegionIds.current.delete(id);
              map.current!.setFeatureState({ source: 'regions-data', id }, { selected: false });
            } else {
              selectedRegionIds.current.add(id);
              map.current!.setFeatureState({ source: 'regions-data', id }, { selected: true });
            }
          }
        });

        map.current.on('mousemove', 'boundaries-hitbox', (e) => {
          if (isDrawingActiveRef.current && drawMethodRef.current === 'click' && e.features && e.features.length > 0) {
            map.current!.getCanvas().style.cursor = 'pointer';
            const fId = e.features[0].properties.customId as number;

            if (hoveredBoundaryId !== null && hoveredBoundaryId !== fId) {
              map.current!.setFeatureState({ source: 'boundaries-data', id: hoveredBoundaryId as number }, { hover: false });
            }
            hoveredBoundaryId = fId;
            map.current!.setFeatureState({ source: 'boundaries-data', id: fId }, { hover: true });
          }
        });

        map.current.on('mouseleave', 'boundaries-hitbox', () => { 
          if (hoveredBoundaryId !== null) {
            map.current!.setFeatureState({ source: 'boundaries-data', id: hoveredBoundaryId as number }, { hover: false });
            hoveredBoundaryId = null;
          }
        });

        map.current.on('dblclick', 'boundaries-hitbox', (e) => {
          if (!isDrawingActiveRef.current || drawMethodRef.current !== 'click') return;
          e.preventDefault(); 
          if (e.features && e.features.length > 0) {
            const clickedCountryCodes = new Set(e.features.map(f => f.properties.countryCode));
            regionsGeoJsonRef.current.features.forEach((f: any) => {
              if (clickedCountryCodes.has(f.properties.countryCode)) {
                const fId = f.properties.customId;
                selectedRegionIds.current.add(fId);
                map.current!.setFeatureState({ source: 'regions-data', id: fId }, { selected: true });
              }
            });
          }
        });

      } catch (error) {
        console.error("Błąd ładowania danych geolokalizacyjnych:", error);
      }

      setIsMapLoaded(true);
      loadStations();
      loadSavedSectors();

    });
  }, [loadStations, loadSavedSectors]); 

  useEffect(() => {
    if (!map.current || !isMapLoaded) return;

    const filteredStations = allStations.filter(s => {
      if (filters.client && s.client !== filters.client) return false;
      if (filters.technician && s.technician !== filters.technician) return false;
      if (filters.model && s.model !== filters.model) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.dateFrom && (!s.inspection_date || s.inspection_date < filters.dateFrom)) return false;
      if (filters.dateTo && (!s.inspection_date || s.inspection_date > filters.dateTo)) return false;
      return true;
    });

    const features = filteredStations
      .filter(station => station.lat && station.lng)
      .map(station => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [station.lng, station.lat] },
        properties: {
          status: station.status || 'Brak akcji',
          station_data: JSON.stringify(station)
        }
      }));

    const source = map.current.getSource('stations-data') as maplibregl.GeoJSONSource;
    if (source) {
      source.setData({
        type: 'FeatureCollection',
        features: features as any
      });
    }

  }, [allStations, filters, isMapLoaded]);

  const handleCalculateRoute = async () => {
    if (!map.current || !routeTechId) return;

    setIsRouting(true);
    try {
      const { data: tickets, error } = await supabase.from('tickets')
        .select('station_id')
        .eq('technician_id', routeTechId)
        .neq('status', 'Zakończone');

      if (error) throw new Error(error.message);

      if (!tickets || tickets.length < 2) {
        alert('Technik musi mieć przypisane co najmniej 2 otwarte zadania, aby wyznaczyć trasę.');
        clearRoute();
        return;
      }

      const stationIds = Array.from(new Set(tickets.map(t => t.station_id)));
      const stationsToVisit = allStations.filter(s => stationIds.includes(s.id) && s.lng && s.lat);

      if (stationsToVisit.length < 2) {
        alert('Część docelowych stacji nie ma ustawionych poprawnych współrzędnych GPS na mapie.');
        return;
      }

      const coordsString = stationsToVisit.map(s => `${Number(s.lng)},${Number(s.lat)}`).join(';');
      const response = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordsString}?source=first&roundtrip=false&geometries=geojson`);
      
      if (!response.ok) {
        throw new Error(`Błąd OSRM (${response.status})`);
      }

      const data = await response.json();

      if (data.code !== 'Ok' || !data.trips || data.trips.length === 0) {
        alert('Błąd silnika drogowego: Nie potrafię połączyć tych punktów trasą.');
        return;
      }

      const routeGeometry = data.trips[0].geometry;
      const source = map.current.getSource('optimized-route') as maplibregl.GeoJSONSource;
      if (source) {
        source.setData(routeGeometry);
      }

      const coordinates = routeGeometry.coordinates;
      if (coordinates && coordinates.length > 0) {
        const bounds = coordinates.reduce((bounds: any, coord: any) => {
          return bounds.extend(coord);
        }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
        map.current.fitBounds(bounds, { padding: 80, duration: 1500 });
      }

      setIsRouteMenuOpen(false);

    } catch (err: any) {
      console.error(err);
      alert(`Wystąpił problem: ${err.message}`);
    } finally {
      setIsRouting(false);
    }
  };

  const clearRoute = () => {
    const source = map.current?.getSource('optimized-route') as maplibregl.GeoJSONSource;
    if (source) source.setData({ type: 'FeatureCollection', features: [] });
    setRouteTechId('');
    setIsRouteMenuOpen(false);
  };

  const selectAllPoland = useCallback(() => {
    if (!map.current || !regionsGeoJsonRef.current) return;

    handleSetDrawMethod('click');
    setDrawingState(true);

    let selectedCount = 0;

    regionsGeoJsonRef.current.features.forEach((f: any) => {
      if (f.properties.countryCode === 'PL') {
        const fId = f.properties.customId;
        selectedRegionIds.current.add(fId);
        map.current!.setFeatureState({ source: 'regions-data', id: fId }, { selected: true });
        selectedCount++;
      }
    });

    if (selectedCount === 0) {
      alert("System jeszcze ładuje granice administracyjne państw. Spróbuj za chwilę.");
    }
  }, []);

  const handleStartDrawingNew = (techName: string, color: string, mode: 'insert' | 'append' | 'update', targetType: 'technician' | 'region', sectorId?: string) => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll(); 
    handleSetDrawMethod('manual');
    setDrawingState(true);
    setActiveDrawContext({ mode, techName, color, sectorId, targetType });
  };

  const handleEditExisting = useCallback((sector: Sector, targetType: 'technician' | 'region', appendMode = false) => {
    if (!drawRef.current || !sector.geometry) return;
    drawRef.current.deleteAll(); 
    const featureIds = drawRef.current.add({ type: 'Feature', geometry: sector.geometry, properties: {} });
    if (appendMode) {
      handleSetDrawMethod('manual');
    } else {
      handleSetDrawMethod('manual', 'direct_select', { featureId: featureIds[0] });
    }
    setDrawingState(true);
    setActiveDrawContext({ mode: 'update', techName: sector.name, color: sector.color, sectorId: sector.id, targetType });
    const targetLayer = targetType === 'technician' ? 'saved-sectors-layer' : 'saved-regions-layer';
    const outlineLayer = targetType === 'technician' ? 'saved-sectors-outline' : 'saved-regions-outline';
    if(map.current?.getLayer(targetLayer)) {
      map.current.setFilter(targetLayer, ['!=', ['get', 'id'], sector.id]);
      map.current.setFilter(outlineLayer, ['!=', ['get', 'id'], sector.id]);
    }
  }, []);

  const cancelDrawing = () => {
    setDrawingState(false);
    setActiveDrawContext(null);
    drawRef.current?.deleteAll();
    selectedRegionIds.current.clear();
    if (map.current && regionsGeoJsonRef.current) {
      regionsGeoJsonRef.current.features.forEach((f: any) => map.current!.setFeatureState({ source: 'regions-data', id: f.properties.customId }, { selected: false }));
    }
    if(map.current?.getLayer('saved-sectors-layer')) {
      map.current.setFilter('saved-sectors-layer', null);
      map.current.setFilter('saved-sectors-outline', null);
      map.current.setFilter('saved-regions-layer', null);
      map.current.setFilter('saved-regions-outline', null);
    }
  };

  const handleSaveDrawing = async (): Promise<boolean> => {
    if (!activeDrawContext) return false;
    let finalGeometry = null;

    if (drawMethodRef.current === 'click') {
      const clickedFeatures = regionsGeoJsonRef.current.features.filter((f: any) => selectedRegionIds.current.has(f.properties.customId));
      const existingFeatures = drawRef.current ? drawRef.current.getAll().features : [];

      if (clickedFeatures.length === 0 && existingFeatures.length === 0) {
        alert('Nie wybrano żadnego obszaru.'); return false;
      }

      const featuresToMerge = [...clickedFeatures, ...existingFeatures];
      const mergedPolygon = mergeRegions(featuresToMerge);
      finalGeometry = ensureMultiPolygon(mergedPolygon?.geometry);

    } else {
      if (!drawRef.current) return false;
      const selectedData = drawRef.current.getAll();
      if (selectedData.features.length === 0) { alert('Kształt jest pusty.'); return false; }
      
      const mergedDrawings = mergeRegions(selectedData.features);
      if (!mergedDrawings) return false;

      let clippingBoundary = masterBoundaryRef.current; 
      
      if (selectedRegionIds.current.size > 0) {
        const featuresToMerge = regionsGeoJsonRef.current.features.filter((f: any) => selectedRegionIds.current.has(f.properties.customId));
        const mergedSelected = mergeRegions(featuresToMerge);
        if (mergedSelected) clippingBoundary = mergedSelected;
      }

      if (clippingBoundary) {
        const clippedFeature = clipToBoundary(mergedDrawings, clippingBoundary);
        if (!clippedFeature) return false; 
        finalGeometry = ensureMultiPolygon(clippedFeature.geometry);
      } else {
        finalGeometry = ensureMultiPolygon(mergedDrawings.geometry);
      }
    }

    // --- KOMPRESJA PRECYZJI ---
    const truncateCoordinates = (coords: any): any => {
      if (typeof coords[0] === 'number') {
        return [Number(coords[0].toFixed(5)), Number(coords[1].toFixed(5))];
      }
      return coords.map(truncateCoordinates);
    };

    if (finalGeometry && finalGeometry.coordinates) {
      finalGeometry.coordinates = truncateCoordinates(finalGeometry.coordinates);
    }

    const tableName = activeDrawContext.targetType === 'technician' ? 'technicians' : 'regions';

    if (activeDrawContext.mode === 'update' && activeDrawContext.sectorId) {
      const { error } = await supabase.from(tableName).update({ zone_geometry: finalGeometry }).eq('id', activeDrawContext.sectorId);
      if (error) { alert(`Błąd aktualizacji: ${error.message}`); return false; }
    } else {
      const { error } = await supabase.from(tableName).insert([{ name: activeDrawContext.techName, color: activeDrawContext.color, zone_geometry: finalGeometry }]);
      if (error) { alert(`Błąd zapisu: ${error.message}`); return false; }
    }

    try {
      await supabase.rpc('refresh_station_zones');
    } catch (e) {
      console.warn("Błąd podczas odświeżania przypisań przestrzennych:", e);
    }

    cancelDrawing(); 
    loadSavedSectors(); 
    loadStations(); 
    
    setRefreshDataTrigger(prev => prev + 1);

    return true;
  };

  const deleteSectorGeometry = async (id: string, targetType: 'technician' | 'region') => {
    const isTech = targetType === 'technician';
    if(!confirm(`Czy na pewno chcesz usunąć ZASIĘG z mapy dla tego ${isTech ? 'technika' : 'regionu'}? \n\nDane tego obiektu nie zostaną usunięte z systemu.`)) return;
    
    const tableName = isTech ? 'technicians' : 'regions';
    const { error } = await supabase.from(tableName).update({ zone_geometry: null }).eq('id', id);
    
    if(error) {
      alert(`Błąd czyszczenia mapy: ${error.message}`);
    } else {
      await supabase.rpc('refresh_station_zones');
      loadSavedSectors();
      loadStations(); 
      setRefreshDataTrigger(prev => prev + 1);
    }
  };

  const hardDeleteEntity = async (id: string, targetType: 'technician' | 'region') => {
    const isTech = targetType === 'technician';
    if(!confirm(`UWAGA!\nCzy na pewno chcesz BEZPOWROTNIE USUNĄĆ ten ${isTech ? 'sektor technika' : 'region'} z bazy danych?`)) return;
    
    const tableName = isTech ? 'technicians' : 'regions';
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    
    if(error) {
      alert(`Błąd usuwania z bazy danych: ${error.message}`);
    } else {
      await supabase.rpc('refresh_station_zones');
      loadSavedSectors();
      loadStations(); 
      setRefreshDataTrigger(prev => prev + 1);
    }
  };

  const flyToStation = (station: any) => {
    setActiveView('map');
    setSelectedStation(station);
    if (map.current && station.lat && station.lng) map.current.flyTo({ center: [station.lng, station.lat], zoom: 17, pitch: 0, essential: true, speed: 1.5 });
  };

  const uniqueClients = Array.from(new Set(allStations.map(s => s.client).filter(Boolean))) as string[];
  const uniqueTechnicians = Array.from(new Set(allStations.map(s => s.technician).filter(Boolean))) as string[];
  const uniqueModels = Array.from(new Set(allStations.map(s => s.model).filter(Boolean))) as string[];
  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
      {isAppLoading && <LoadingScreen />}
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      
      <Sidebar 
        activeView={activeView} 
        onChangeView={setActiveView} 
        onHover={setIsSidebarHovered} 
      />

      {activeView === 'map' && (
        <>
          <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} onAddStation={(lat, lng) => { setModalLatLng({ lat, lng }); setIsAddModalOpen(true); }} onEditSector={() => { setIsSectorEditorOpen(true); if (!showSectorsRef.current) toggleSectorsVisibility(true); }} />
          
          <StationPanel 
            station={selectedStation} 
            onClose={() => setSelectedStation(null)} 
            onEdit={(s) => {
              setEditingStationMap(s);
              setIsAddModalOpen(true);
            }}
          />
          
          <AddStationModal 
            isOpen={isAddModalOpen || !!editingStationMap} 
            onClose={() => { 
              setIsAddModalOpen(false); 
              setEditingStationMap(null);
              setModalLatLng(null); 
            }} 
            initialLatLng={modalLatLng} 
            onSuccess={() => {
              loadStations();
              setSelectedStation(null);
              setRefreshDataTrigger(prev => prev + 1);
            }} 
            editingStation={editingStationMap}
          />

          <SectorEditor 
            isOpen={isSectorEditorOpen} 
            onClose={() => { setIsSectorEditorOpen(false); cancelDrawing(); }} 
            sectors={savedSectorsList} 
            regions={savedRegionsList} 
            isDrawingActive={isDrawingActive}
            onStartDrawingNew={handleStartDrawingNew} 
            onEditExisting={handleEditExisting} 
            onSaveDrawing={handleSaveDrawing} 
            onCancelDrawing={cancelDrawing} 
            onDeleteSector={deleteSectorGeometry} 
            drawMethod={drawMethod} 
            onSetDrawMethod={handleSetDrawMethod} 
            onSelectAllPoland={selectAllPoland}
            onHardDeleteEntity={hardDeleteEntity}
          />

          <div className={`absolute top-6 left-[96px] z-20 flex gap-3 transition-transform duration-300 ease-out ${isSidebarHovered ? 'translate-x-[184px]' : 'translate-x-0'}`}>
            
            <button onClick={() => setIsAddModalOpen(true)} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg px-4 py-2.5 rounded-xl text-slate-700 font-bold hover:bg-white/95 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm">
              <IconPlus /> Dodaj stację
            </button>
            
            <button onClick={() => toggleSectorsVisibility()} className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-lg px-4 py-2.5 rounded-xl text-slate-700 font-bold hover:bg-white/95 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm">
              {showSectors ? 'Ukryj strefy' : <><IconLayers /> Pokaż strefy</>}
            </button>

            <div className="relative" ref={filterRef}>
              <button 
                onClick={() => { setIsFilterOpen(!isFilterOpen); setIsRouteMenuOpen(false); }} 
                className={`shadow-lg border px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${isFilterOpen || activeFiltersCount > 0 ? 'bg-[#58b347]/15 backdrop-blur-xl border-[#58b347]/30 text-[#58b347] hover:bg-[#58b347]/25' : 'bg-white/70 backdrop-blur-xl border-white/50 text-slate-700 hover:bg-white/95 hover:text-[#58b347]'}`}
              >
                <IconFilter /> Filtry mapy {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>

              {isFilterOpen && (
                <div className="absolute top-12 left-0 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 p-5 z-[100] flex flex-col gap-4 animate-fadeIn">
                  <div className="border-b border-slate-100/60 pb-2 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-sm">Filtruj stacje</h3>
                    {activeFiltersCount > 0 && <button onClick={() => setFilters({ client: '', technician: '', model: '', status: '', dateFrom: '', dateTo: '' })} className="text-xs text-red-500 hover:underline font-bold">Wyczyść filtry</button>}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Status zadania</label>
                      <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50">
                        <option value="">Wszystkie statusy</option>
                        <option value="Brak akcji">Brak akcji (Zielone)</option>
                        <option value="Uruchomienie">Uruchomienie (Fioletowe)</option>
                        <option value="Przegląd">Przegląd (Niebieskie)</option>
                        <option value="Awaria">Awaria (Czerwone)</option>
                        <option value="Zlecenie jakościowe">Zlecenie jakościowe (Pomarańczowe)</option>
                        <option value="Naprawa odpłatna">Naprawa odpłatna (Bursztynowe)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Opiekun / Technik</label>
                      <select value={filters.technician} onChange={(e) => setFilters({...filters, technician: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50">
                        <option value="">Wszyscy technicy</option>
                        {uniqueTechnicians.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Klient / Sieć</label>
                      <select value={filters.client} onChange={(e) => setFilters({...filters, client: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50">
                        <option value="">Wszyscy klienci</option>
                        {uniqueClients.map((c, idx) => <option key={idx} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Model ładowarki</label>
                      <select value={filters.model} onChange={(e) => setFilters({...filters, model: e.target.value})} className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50">
                        <option value="">Wszystkie modele</option>
                        {uniqueModels.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Data przeglądu UDT (Okres)</label>
                      <div className="flex items-center gap-2">
                        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50" />
                        <span className="text-slate-400 text-xs">-</span>
                        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="w-full text-xs font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={routeRef}>
              <button 
                onClick={() => { setIsRouteMenuOpen(!isRouteMenuOpen); setIsFilterOpen(false); }} 
                className={`shadow-lg border px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm ${isRouteMenuOpen ? 'bg-[#58b347]/15 backdrop-blur-xl border-[#58b347]/30 text-[#58b347] hover:bg-[#58b347]/25' : 'bg-white/70 backdrop-blur-xl border-white/50 text-slate-700 hover:bg-white/95 hover:text-[#58b347]'}`}
              >
                <IconRoute /> Trasy logistyczne
              </button>

              {isRouteMenuOpen && (
                <div className="absolute top-12 left-0 w-80 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/60 p-5 z-[100] flex flex-col gap-4 animate-fadeIn">
                  <div className="border-b border-slate-100/60 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm">Wyznacz optymalną trasę</h3>
                    <p className="text-xs text-slate-500 mt-1">Połącz otwarte zadania technika najszybszą drogą drogową (API OSRM).</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">Wybierz technika mobilnego</label>
                      <select value={routeTechId} onChange={(e) => setRouteTechId(e.target.value)} className="w-full text-sm font-semibold border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-[#58b347] bg-white/50">
                        <option value="">Wybierz...</option>
                        {savedSectorsList.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    
                    <button 
                      onClick={handleCalculateRoute} 
                      disabled={isRouting || !routeTechId}
                      className="w-full bg-[#58b347] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#499b3a] transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isRouting ? 'Wyznaczanie...' : 'Oblicz optymalną trasę'}
                    </button>
                    
                    <button onClick={clearRoute} className="w-full text-xs text-slate-400 hover:text-red-500 font-bold py-1.5 transition-colors">
                      Wyczyść linię z mapy
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {activeView === 'stations' && <StationsDatabase onFocusStation={flyToStation} isSidebarHovered={isSidebarHovered} refreshTrigger={refreshDataTrigger} />}
      {activeView === 'technicians' && <TechniciansDatabase isSidebarHovered={isSidebarHovered} />}
      {activeView === 'tickets' && <TicketsDatabase />}
      {activeView === 'calendar' && <CalendarView />}
      {activeView === 'equipment' && <EquipmentManager isSidebarHovered={isSidebarHovered} />}
      {activeView === 'clients' && <ClientsDatabase />}
      
      {activeView === 'analytics' && (
        <AnalyticsDashboard 
          onChangeView={setActiveView} 
          isSidebarHovered={isSidebarHovered} 
        />
      )}
    </div>
  );
}