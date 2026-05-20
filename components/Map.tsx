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
import AnalyticsDashboard from './AnalyticsDashboard'; // <--- DODANY IMPORT

import { buildOuterBoundary, mergeRegions, clipToBoundary, ensureMultiPolygon } from '../utils/geometryEngine';

// Definiujemy kraje i ich kody
const COUNTRY_SOURCES = [
  { url: '/poland.geojson', code: 'PL' },
  { url: '/slovakia.geojson', code: 'SK' }
];

const IconFilter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;

export default function ChargeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const [isAppLoading, setIsAppLoading] = useState(true);
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
  const [filters, setFilters] = useState({
    client: '', technician: '', model: '', status: '', dateFrom: '', dateTo: ''
  });

  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const isDrawingActiveRef = useRef(false);

  const [drawMethod, setDrawMethod] = useState<'manual' | 'click'>('manual');
  const drawMethodRef = useRef<'manual' | 'click'>('manual');

  // Uniwersalne referencje dla wszystkich krajów
  const regionsGeoJsonRef = useRef<any>(null);
  const masterBoundaryRef = useRef<any>(null); // Do przycinania manualnego rysowania
  const selectedRegionIds = useRef<Set<number>>(new Set());

  const [showSectors, setShowSectors] = useState(false);
  const showSectorsRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 2000);
    return () => clearTimeout(timer);
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

  const [activeDrawContext, setActiveDrawContext] = useState<{
    mode: 'insert' | 'append' | 'update'; techName: string; color: string; sectorId?: string; targetType: 'technician' | 'region';
  } | null>(null);

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
    if (data) {
      setAllStations(data as Station[]);
    }
  }, []);

  useEffect(() => {
    if (!map.current) return;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const filteredStations = allStations.filter(s => {
      if (filters.client && s.client !== filters.client) return false;
      if (filters.technician && s.technician !== filters.technician) return false;
      if (filters.model && s.model !== filters.model) return false;
      if (filters.status && s.status !== filters.status) return false;
      if (filters.dateFrom && (!s.inspection_date || s.inspection_date < filters.dateFrom)) return false;
      if (filters.dateTo && (!s.inspection_date || s.inspection_date > filters.dateTo)) return false;
      return true;
    });

    filteredStations.forEach((station: Station) => {
      if (!station.lat || !station.lng) return;
      
      let markerColor = '#58b347'; 
      switch(station.status) {
        case 'Awaria': markerColor = '#ef4444'; break;
        case 'Uruchomienie': markerColor = '#8b5cf6'; break;
        case 'Przegląd': markerColor = '#3b82f6'; break;
        case 'Zlecenie jakościowe': markerColor = '#f97316'; break;
        case 'Naprawa odpłatna': markerColor = '#eab308'; break;
        case 'Brak akcji': default: markerColor = '#58b347'; break;
      }

      const el = document.createElement('div');
      el.className = 'w-4 h-4 border-2 border-white rounded-full shadow-sm hover:scale-110 transition-transform z-40';
      el.style.backgroundColor = markerColor;
      el.style.cursor = 'pointer';

      const marker = new maplibregl.Marker({ element: el }).setLngLat([station.lng, station.lat]).addTo(map.current!);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setSelectedStation(station);
        setContextMenu(null);
      });
      markersRef.current.push(marker);
    });
  }, [allStations, filters]);

  const loadSavedSectors = useCallback(async () => {
    const [techs, regs] = await Promise.all([
      supabase.from('technicians').select('id, name, color, zone_geometry'),
      supabase.from('regions').select('id, name, color, zone_geometry')
    ]);

    if (techs.data) {
      const mappedTechs = techs.data.map(d => ({ id: d.id, name: d.name, color: d.color, geometry: d.zone_geometry }));
      setSavedSectorsList(mappedTechs);
      
      if (map.current?.getSource('saved-sectors')) {
        const features = mappedTechs.filter(t => t.geometry).map(t => ({ type: 'Feature', geometry: t.geometry, properties: { id: t.id, name: t.name, color: t.color }}));
        (map.current.getSource('saved-sectors') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features } as any);
      }
    }

    if (regs.data) {
      const mappedRegs = regs.data.map(d => ({ id: d.id, name: d.name, color: d.color, geometry: d.zone_geometry }));
      setSavedRegionsList(mappedRegs);
      
      if (map.current?.getSource('saved-regions')) {
        const features = mappedRegs.filter(r => r.geometry).map(r => ({ type: 'Feature', geometry: r.geometry, properties: { id: r.id, name: r.name, color: r.color }}));
        (map.current.getSource('saved-regions') as maplibregl.GeoJSONSource).setData({ type: 'FeatureCollection', features } as any);
      }
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

      loadStations();

      map.current.addSource('saved-regions', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: 'saved-regions-layer', type: 'fill', source: 'saved-regions', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.1 } });
      map.current.addLayer({ id: 'saved-regions-outline', type: 'line', source: 'saved-regions', layout: { visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 2] } });

      map.current.addSource('saved-sectors', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.current.addLayer({ id: 'saved-sectors-layer', type: 'fill', source: 'saved-sectors', layout: { visibility: 'none' }, paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.2 } });
      map.current.addLayer({ id: 'saved-sectors-outline', type: 'line', source: 'saved-sectors', layout: { visibility: 'none' }, paint: { 'line-color': ['get', 'color'], 'line-width': 2 } });

      loadSavedSectors();

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
            // Przetwarzanie województw/regionów wewnętrznych
            data.features.forEach((f: any) => {
              combinedFeatures.push({
                ...f,
                id: globalId,
                properties: { ...f.properties, customId: globalId, countryCode: code }
              });
              globalId++;
            });

            // Tworzenie OSOBNEJ obwódki dla każdego kraju
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
        // Master boundary to złączenie wszystkich krajów - przydatne tylko do przycinania manualnego rysowania
        masterBoundaryRef.current = buildOuterBoundary(combinedGeoJson) || combinedGeoJson.features[0];

        map.current.addSource('regions-data', { type: 'geojson', data: combinedGeoJson as any, promoteId: 'customId' });
        map.current.addSource('boundaries-data', { type: 'geojson', data: boundariesGeoJson as any, promoteId: 'customId' });
        
        // Warstwy wewnętrzne województw
        map.current.addLayer({ 
          id: 'regions-fill', type: 'fill', source: 'regions-data', 
          paint: { 
            'fill-color': '#58b347', 
            'fill-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 0.6, ['boolean', ['feature-state', 'hover'], false], 0.2, 0.02] 
          }
        });
        map.current.addLayer({ id: 'regions-outline', type: 'line', source: 'regions-data', paint: { 'line-color': '#cbd5e1', 'line-width': 1, 'line-dasharray': [3, 3] }});

        // Warstwy granic państw (Oddzielne dla każdego kraju, ale gruby hitbox pozwoli złapać oba na styku)
        map.current.addLayer({ id: 'boundaries-hitbox', type: 'line', source: 'boundaries-data', paint: { 'line-width': 20, 'line-color': 'transparent' }});
        map.current.addLayer({ id: 'boundaries-glow', type: 'line', source: 'boundaries-data', paint: { 'line-width': 4, 'line-color': '#58b347', 'line-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 1, 0] }});

        let hoveredStateId: number | null = null;
        let hoveredBoundaryId: number | null = null;

        // --- HOVER I KLIKANIE WOJEWÓDZTW (Pojedyncze) ---
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

        // --- HOVER I PODWÓJNE KLIKANIE GRANIC PAŃSTW ---
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
            // Zbieramy tagi państw w które uderzył podwójny klik (jeden na środku granicy, lub dwa na styku)
            const clickedCountryCodes = new Set(e.features.map(f => f.properties.countryCode));

            // Przeszukujemy bazę regionów i dodajemy tylko te, które należą do klikniętych państw
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
    });
  }, [loadStations, loadSavedSectors]); 

  // Pusta funkcja dla zachowania kompatybilności przycisku w SectorEditor (można ją później całkowicie usunąć)
  const selectAllPoland = useCallback(() => {}, []);

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

    const tableName = activeDrawContext.targetType === 'technician' ? 'technicians' : 'regions';

    if (activeDrawContext.mode === 'update' && activeDrawContext.sectorId) {
      const { error } = await supabase.from(tableName).update({ zone_geometry: finalGeometry }).eq('id', activeDrawContext.sectorId);
      if (error) { alert(`Błąd aktualizacji: ${error.message}`); return false; }
    } else {
      const { error } = await supabase.from(tableName).insert([{ name: activeDrawContext.techName, color: activeDrawContext.color, zone_geometry: finalGeometry }]);
      if (error) { alert(`Błąd zapisu: ${error.message}`); return false; }
    }

    cancelDrawing(); 
    loadSavedSectors(); 
    return true;
  };

  const deleteSector = async (id: string, targetType: 'technician' | 'region') => {
    if(!confirm('Na pewno wyczyścić cały obszar roboczy z mapy dla tego obiektu? (Dane pozostaną w bazie)')) return;
    const tableName = targetType === 'technician' ? 'technicians' : 'regions';
    const { error } = await supabase.from(tableName).update({ zone_geometry: null }).eq('id', id);
    if(error) alert('Błąd usuwania strefy z bazy');
    else loadSavedSectors();
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
      <Sidebar activeView={activeView} onChangeView={setActiveView} />

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
            }} 
            editingStation={editingStationMap}
          />

          <SectorEditor 
            isOpen={isSectorEditorOpen} onClose={() => { setIsSectorEditorOpen(false); cancelDrawing(); }} sectors={savedSectorsList} regions={savedRegionsList} isDrawingActive={isDrawingActive}
            onStartDrawingNew={handleStartDrawingNew} onEditExisting={handleEditExisting} onSaveDrawing={handleSaveDrawing} onCancelDrawing={cancelDrawing} onDeleteSector={deleteSector} drawMethod={drawMethod} onSetDrawMethod={handleSetDrawMethod} onSelectAllPoland={selectAllPoland}
          />

          <div className="absolute top-6 left-[96px] z-20 flex gap-3">
            <button onClick={() => setIsAddModalOpen(true)} className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 px-4 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-green-50 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Dodaj stację
            </button>
            <button onClick={() => toggleSectorsVisibility()} className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 px-4 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-green-50 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm">
              {showSectors ? 'Ukryj strefy' : 'Pokaż strefy'}
            </button>

            <div className="relative">
              <button onClick={() => setIsFilterOpen(!isFilterOpen)} className={`backdrop-blur-md shadow-lg border px-4 py-2.5 rounded-lg font-medium transition-all flex items-center gap-2 text-sm ${isFilterOpen || activeFiltersCount > 0 ? 'bg-green-50 text-[#58b347] border-[#58b347]' : 'bg-white/95 border-slate-200 text-slate-700 hover:bg-green-50 hover:text-[#58b347]'}`}>
                <IconFilter /> Filtry mapy {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>

              {isFilterOpen && (
                <div className="absolute top-12 left-0 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 z-[100] flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h3 className="font-bold text-slate-800 text-sm">Filtruj stacje</h3>
                    {activeFiltersCount > 0 && <button onClick={() => setFilters({ client: '', technician: '', model: '', status: '', dateFrom: '', dateTo: '' })} className="text-xs text-red-500 hover:underline font-medium">Wyczyść filtry</button>}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Status zadania</label>
                      <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-[#58b347]">
                        <option value="">Wszystkie statusy</option>
                        <option value="Brak akcji">Brak akcji (Zielone)</option>
                        <option value="Uruchomienie">Uruchomienie (Fioletowe)</option>
                        <option value="Przegląd">Przegląd (Niebieskie)</option>
                        <option value="Awaria">Awaria (Czerwone)</option>
                        <option value="Zlecenie jakościowe">Zlecenie jakościowe (Pomarańczowe)</option>
                        <option value="Naprawa odpłatna">Naprawa odpłatna (Bursztynowe)</option>
                      </select>
                    </div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Opiekun / Technik</label><select value={filters.technician} onChange={(e) => setFilters({...filters, technician: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-[#58b347]"><option value="">Wszyscy technicy</option>{uniqueTechnicians.map((t, idx) => <option key={idx} value={t}>{t}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Klient / Sieć</label><select value={filters.client} onChange={(e) => setFilters({...filters, client: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-[#58b347]"><option value="">Wszyscy klienci</option>{uniqueClients.map((c, idx) => <option key={idx} value={c}>{c}</option>)}</select></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">Model ładowarki</label><select value={filters.model} onChange={(e) => setFilters({...filters, model: e.target.value})} className="w-full text-sm border border-slate-200 rounded p-2 focus:outline-none focus:border-[#58b347]"><option value="">Wszystkie modele</option>{uniqueModels.map((m, idx) => <option key={idx} value={m}>{m}</option>)}</select></div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Data przeglądu UDT (Okres)</label>
                      <div className="flex items-center gap-2">
                        <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-[#58b347]" />
                        <span className="text-slate-400 text-xs">-</span>
                        <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="w-full text-xs border border-slate-200 rounded p-1.5 focus:outline-none focus:border-[#58b347]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeView === 'stations' && <StationsDatabase onFocusStation={flyToStation} />}
      {activeView === 'technicians' && <TechniciansDatabase />}
      {activeView === 'tickets' && <TicketsDatabase />}
      {activeView === 'calendar' && <CalendarView />}
      {activeView === 'equipment' && <EquipmentManager />}
      {activeView === 'clients' && <ClientsDatabase />}
      {activeView === 'analytics' && <AnalyticsDashboard />}
    </div>
  );
}