'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
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
import TicketsDatabase from './TicketsDatabase'; // Zaimportowany szablon ticketów
import { LoadingScreen } from './EkoenLogo';

const DETAILED_POLAND_URL = 'https://raw.githubusercontent.com/ppatrzyk/polska-geojson/master/wojewodztwa/wojewodztwa-medium.geojson';

export default function ChargeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  // Ekran ładowania systemu Ekoen
  const [isAppLoading, setIsAppLoading] = useState(true);
  
  const [activeView, setActiveView] = useState<ViewState>('map');

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLatLng, setModalLatLng] = useState<{lat: number, lng: number} | null>(null);
  const [isSectorEditorOpen, setIsSectorEditorOpen] = useState(false);
  
  const [savedSectorsList, setSavedSectorsList] = useState<Sector[]>([]);
  const sectorsListRef = useRef<Sector[]>([]);

  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const isDrawingActiveRef = useRef(false);

  const [showSectors, setShowSectors] = useState(false);
  const showSectorsRef = useRef(false);

  // Efekt startowego ładowania aplikacji (animacja logo)
  useEffect(() => {
    const timer = setTimeout(() => setIsAppLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const setDrawingState = (isActive: boolean) => {
    setIsDrawingActive(isActive);
    isDrawingActiveRef.current = isActive;
  };

  const [activeDrawContext, setActiveDrawContext] = useState<{
    mode: 'insert' | 'append' | 'update';
    techName: string;
    color: string;
    sectorId?: string;
  } | null>(null);

  const toggleSectorsVisibility = (forceShow?: boolean) => {
    const newState = forceShow !== undefined ? forceShow : !showSectors;
    setShowSectors(newState);
    showSectorsRef.current = newState;
    
    if (map.current) {
      if (map.current.getLayer('saved-sectors-layer')) {
        map.current.setLayoutProperty('saved-sectors-layer', 'visibility', newState ? 'visible' : 'none');
      }
      if (map.current.getLayer('saved-sectors-outline')) {
        map.current.setLayoutProperty('saved-sectors-outline', 'visibility', newState ? 'visible' : 'none');
      }
    }
  };

  const loadStations = useCallback(async () => {
    const { data } = await supabase.from('stations').select('*');
    if (data && map.current) {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      data.forEach((station: Station) => {
        if (!station.lat || !station.lng) return;
        const markerColor = station.status === 'Awaria' ? '#ef4444' : '#58b347';
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
    }
  }, []);

  const loadSavedSectors = useCallback(async () => {
    const { data, error } = await supabase.from('technicians').select('id, name, color, zone_geometry');
    if (error) return;
    
    if (data && map.current) {
      const mappedSectors = data.map(d => ({ id: d.id, name: d.name, color: d.color, geometry: d.zone_geometry }));
      setSavedSectorsList(mappedSectors);
      sectorsListRef.current = mappedSectors;

      if (map.current.getLayer('saved-sectors-layer')) map.current.removeLayer('saved-sectors-layer');
      if (map.current.getLayer('saved-sectors-outline')) map.current.removeLayer('saved-sectors-outline');
      if (map.current.getSource('saved-sectors')) map.current.removeSource('saved-sectors');

      const features = data.filter(tech => tech.zone_geometry).map(tech => ({
        type: 'Feature', geometry: tech.zone_geometry, properties: { id: tech.id, name: tech.name, color: tech.color }
      }));

      map.current.addSource('saved-sectors', { type: 'geojson', data: { type: 'FeatureCollection', features } as any });

      map.current.addLayer({
        id: 'saved-sectors-layer', type: 'fill', source: 'saved-sectors',
        layout: { visibility: showSectorsRef.current ? 'visible' : 'none' },
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 }
      });
      map.current.addLayer({
        id: 'saved-sectors-outline', type: 'line', source: 'saved-sectors',
        layout: { visibility: showSectorsRef.current ? 'visible' : 'none' },
        paint: { 'line-color': ['get', 'color'], 'line-width': 2 }
      });
    }
  }, []);

  // Synchronizacja widoku mapy po przełączeniu widoków
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

    map.current.on('load', () => {
      if (!map.current) return;
      loadStations();
      loadSavedSectors();

      map.current.addSource('poland-data', { type: 'geojson', data: DETAILED_POLAND_URL });
      map.current.addLayer({ id: 'poland-fill', type: 'fill', source: 'poland-data', paint: { 'fill-color': '#58b347', 'fill-opacity': ['case', ['boolean', ['feature-state', 'hover'], false], 0.04, 0.01] }});
      map.current.addLayer({ id: 'poland-outline', type: 'line', source: 'poland-data', paint: { 'line-color': '#cbd5e1', 'line-width': 1, 'line-dasharray': [3, 3] }});

      map.current.on('contextmenu', (e) => {
        e.preventDefault(); 
        setContextMenu({ x: e.point.x, y: e.point.y, lng: e.lngLat.lng, lat: e.lngLat.lat });
      });

      map.current.on('click', () => setContextMenu(null));
    });
  }, [loadStations, loadSavedSectors]); 

  const handleStartDrawingNew = (techName: string, color: string, mode: 'insert' | 'append' | 'update', sectorId?: string) => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll(); 
    drawRef.current.changeMode('draw_polygon');
    setDrawingState(true);
    setActiveDrawContext({ mode, techName, color, sectorId });
  };

  const handleEditExisting = useCallback((sector: Sector) => {
    if (!drawRef.current || !sector.geometry) return;
    drawRef.current.deleteAll(); 
    const featureIds = drawRef.current.add({ type: 'Feature', geometry: sector.geometry, properties: {} });
    drawRef.current.changeMode('direct_select', { featureId: featureIds[0] });
    setDrawingState(true);
    setActiveDrawContext({ mode: 'update', techName: sector.name, color: sector.color, sectorId: sector.id });

    if(map.current?.getLayer('saved-sectors-layer')) {
      map.current.setFilter('saved-sectors-layer', ['!=', ['get', 'id'], sector.id]);
      map.current.setFilter('saved-sectors-outline', ['!=', ['get', 'id'], sector.id]);
    }
  }, []);

  const cancelDrawing = () => {
    setDrawingState(false);
    setActiveDrawContext(null);
    drawRef.current?.deleteAll();
    if(map.current?.getLayer('saved-sectors-layer')) {
      map.current.setFilter('saved-sectors-layer', null);
      map.current.setFilter('saved-sectors-outline', null);
    }
  };

  const handleSaveDrawing = async (): Promise<boolean> => {
    if (!drawRef.current || !activeDrawContext) return false;
    const selectedData = drawRef.current.getAll();
    if (selectedData.features.length === 0) { alert('Kształt jest pusty.'); return false; }
    const geometry = selectedData.features[0].geometry;

    if (activeDrawContext.mode === 'update' && activeDrawContext.sectorId) {
      const { error } = await supabase.from('technicians').update({ zone_geometry: geometry }).eq('id', activeDrawContext.sectorId);
      if (error) { alert(`Błąd aktualizacji: ${error.message}`); return false; }
    } else {
      const { error } = await supabase.rpc('add_snapped_sector', { p_tech_name: activeDrawContext.techName, p_tech_color: activeDrawContext.color, p_new_geom: geometry });
      if (error) { alert(`Błąd zapisu: ${error.message}`); return false; }
    }

    cancelDrawing(); 
    loadSavedSectors(); 
    return true;
  };

  const deleteSector = async (id: string) => {
    if(!confirm('Na pewno wyczyścić cały obszar roboczy z mapy dla tego technika? (Jego dane pozostaną w bazie)')) return;
    const { error } = await supabase.from('technicians').update({ zone_geometry: null }).eq('id', id);
    if(error) alert('Błąd usuwania strefy z bazy');
    else loadSavedSectors();
  };

  const flyToStation = (station: any) => {
    setActiveView('map');
    setSelectedStation(station);
    
    if (map.current && station.lat && station.lng) {
      map.current.flyTo({
        center: [station.lng, station.lat],
        zoom: 17,
        pitch: 0,
        essential: true,
        speed: 1.5
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-50 overflow-hidden">
      {/* Animowany Ekran Startowy Ekoen */}
      {isAppLoading && <LoadingScreen />}

      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
      <Sidebar activeView={activeView} onChangeView={setActiveView} />

      {activeView === 'map' && (
        <>
          <ContextMenu 
            menu={contextMenu} 
            onClose={() => setContextMenu(null)}
            onAddStation={(lat, lng) => { setModalLatLng({ lat, lng }); setIsAddModalOpen(true); }}
            onEditSector={() => {
              setIsSectorEditorOpen(true);
              if (!showSectorsRef.current) toggleSectorsVisibility(true);
            }}
          />

          <StationPanel station={selectedStation} onClose={() => setSelectedStation(null)} />
          <AddStationModal isOpen={isAddModalOpen} onClose={() => { setIsAddModalOpen(false); setModalLatLng(null); }} initialLatLng={modalLatLng} onSuccess={loadStations} />
          
          <SectorEditor 
            isOpen={isSectorEditorOpen} onClose={() => { setIsSectorEditorOpen(false); cancelDrawing(); }} sectors={savedSectorsList} isDrawingActive={isDrawingActive}
            onStartDrawingNew={handleStartDrawingNew} onEditExisting={handleEditExisting} onSaveDrawing={handleSaveDrawing} onCancelDrawing={cancelDrawing} onDeleteSector={deleteSector}
          />

          <div className="absolute top-6 left-[96px] z-20 flex gap-3">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 px-4 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-green-50 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
              Dodaj stację
            </button>
            <button 
              onClick={() => toggleSectorsVisibility()} 
              className="bg-white/95 backdrop-blur-md shadow-lg border border-slate-200 px-4 py-2.5 rounded-lg text-slate-700 font-medium hover:bg-green-50 hover:text-[#58b347] transition-all flex items-center gap-2 text-sm"
            >
              {showSectors ? (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
              {showSectors ? 'Ukryj strefy' : 'Pokaż strefy'}
            </button>
          </div>
        </>
      )}

      {/* Aktywne moduły zintegrowane */}
      {activeView === 'stations' && <StationsDatabase onFocusStation={flyToStation} />}
      {activeView === 'technicians' && <TechniciansDatabase />}
      {activeView === 'tickets' && <TicketsDatabase />} {/* Podpięty nowy komponent */}
      
      {/* Zaślepka dla modułów w budowie */}
      {['equipment', 'analytics', 'clients', 'calendar'].includes(activeView) && (
        <div className="absolute inset-0 left-[72px] z-40 bg-slate-50/95 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center bg-white p-10 rounded-2xl shadow-xl border border-slate-200">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Moduł w budowie</h2>
            <p className="text-slate-500">
              Ten moduł zostanie wdrożony w kolejnym kroku integracji.
            </p>
            <button 
              onClick={() => setActiveView('map')}
              className="mt-6 text-[#58b347] font-bold hover:underline"
            >
              ← Wróć na mapę
            </button>
          </div>
        </div>
      )}
    </div>
  );
}