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

const DETAILED_POLAND_URL =
  'https://raw.githubusercontent.com/ppatrzyk/polska-geojson/master/wojewodztwa/wojewodztwa-medium.geojson';

export default function ChargeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const drawRef = useRef<MapboxDraw | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalLatLng, setModalLatLng] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [isSectorEditorOpen, setIsSectorEditorOpen] = useState(false);

  const [savedSectorsList, setSavedSectorsList] = useState<Sector[]>([]);
  const sectorsListRef = useRef<Sector[]>([]);

  const [isDrawingActive, setIsDrawingActive] = useState(false);
  const isDrawingActiveRef = useRef(false);

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

  const loadStations = useCallback(async () => {
    const { data } = await supabase.from('stations').select('*');
    if (data && map.current) {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];

      data.forEach((station: Station) => {
        if (!station.lat || !station.lng) return;
        const markerColor = station.status === 'Awaria' ? '#ef4444' : '#10b981';
        const el = document.createElement('div');
        el.className =
          'w-5 h-5 border-2 border-white rounded-full shadow-lg hover:scale-125 transition-transform z-40';
        el.style.backgroundColor = markerColor;
        el.style.boxShadow = `0 0 10px ${markerColor}`;
        el.style.cursor = 'pointer';

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([station.lng, station.lat])
          .addTo(map.current!);
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
    const { data, error } = await supabase
      .from('technicians')
      .select('id, name, color, zone_geometry');
    if (error) {
      console.error(error);
      return;
    }

    if (data && map.current) {
      const mappedSectors = data.map((d) => ({
        id: d.id,
        name: d.name,
        color: d.color,
        geometry: d.zone_geometry,
      }));
      setSavedSectorsList(mappedSectors);
      sectorsListRef.current = mappedSectors;

      if (map.current.getLayer('saved-sectors-layer'))
        map.current.removeLayer('saved-sectors-layer');
      if (map.current.getLayer('saved-sectors-outline'))
        map.current.removeLayer('saved-sectors-outline');
      if (map.current.getSource('saved-sectors'))
        map.current.removeSource('saved-sectors');

      const features = data
        .filter((tech) => tech.zone_geometry)
        .map((tech) => ({
          type: 'Feature',
          geometry: tech.zone_geometry,
          properties: { id: tech.id, name: tech.name, color: tech.color },
        }));

      map.current.addSource('saved-sectors', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features } as any,
      });

      map.current.addLayer({
        id: 'saved-sectors-layer',
        type: 'fill',
        source: 'saved-sectors',
        paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.15 },
      });

      map.current.addLayer({
        id: 'saved-sectors-outline',
        type: 'line',
        source: 'saved-sectors',
        paint: { 'line-color': ['get', 'color'], 'line-width': 2.5 },
      });
    }
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [19.14, 51.91],
      zoom: 5.5,
      pitch: 0,
      dragRotate: false,
      doubleClickZoom: false,
    });

    drawRef.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: { polygon: false, trash: false },
    });
    map.current.addControl(drawRef.current as any);

    map.current.on('load', () => {
      if (!map.current) return;
      loadStations();
      loadSavedSectors();

      map.current.addSource('poland-data', {
        type: 'geojson',
        data: DETAILED_POLAND_URL,
      });
      map.current.addLayer({
        id: 'poland-fill',
        type: 'fill',
        source: 'poland-data',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.08,
            0.01,
          ],
        },
      });
      map.current.addLayer({
        id: 'poland-outline',
        type: 'line',
        source: 'poland-data',
        paint: {
          'line-color': '#cbd5e1',
          'line-width': 1,
          'line-dasharray': [3, 3],
        },
      });

      map.current.on('contextmenu', (e) => {
        e.preventDefault();
        setContextMenu({
          x: e.point.x,
          y: e.point.y,
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
        });
      });

      map.current.on('click', () => setContextMenu(null));
    });
  }, [loadStations, loadSavedSectors]);

  // --- LOGIKA EDYTORA STREF ---

  const handleStartDrawingNew = (
    techName: string,
    color: string,
    mode: 'insert' | 'append'
  ) => {
    if (!drawRef.current) return;
    drawRef.current.deleteAll();
    drawRef.current.changeMode('draw_polygon');
    setDrawingState(true);
    setActiveDrawContext({ mode, techName, color });
  };

  const handleEditExisting = useCallback((sector: Sector) => {
    if (!drawRef.current || !sector.geometry) return;
    drawRef.current.deleteAll();

    const featureIds = drawRef.current.add({
      type: 'Feature',
      geometry: sector.geometry,
      properties: {},
    });
    drawRef.current.changeMode('direct_select', { featureId: featureIds[0] });
    setDrawingState(true);
    setActiveDrawContext({
      mode: 'update',
      techName: sector.name,
      color: sector.color,
      sectorId: sector.id,
    });

    if (map.current?.getLayer('saved-sectors-layer')) {
      map.current.setFilter('saved-sectors-layer', [
        '!=',
        ['get', 'id'],
        sector.id,
      ]);
      map.current.setFilter('saved-sectors-outline', [
        '!=',
        ['get', 'id'],
        sector.id,
      ]);
    }
  }, []);

  const cancelDrawing = () => {
    setDrawingState(false);
    setActiveDrawContext(null);
    drawRef.current?.deleteAll();
    if (map.current?.getLayer('saved-sectors-layer')) {
      map.current.setFilter('saved-sectors-layer', null);
      map.current.setFilter('saved-sectors-outline', null);
    }
  };

  const handleSaveDrawing = async (): Promise<boolean> => {
    if (!drawRef.current || !activeDrawContext) return false;

    const selectedData = drawRef.current.getAll();
    if (selectedData.features.length === 0) {
      alert('Kształt jest pusty!');
      return false;
    }

    const geometry = selectedData.features[0].geometry;

    if (
      activeDrawContext.mode === 'insert' ||
      activeDrawContext.mode === 'append'
    ) {
      // Używamy naszej nowej funkcji RPC z PostGIS do klejenia i obcinania!
      const { error } = await supabase.rpc('add_snapped_sector', {
        p_tech_name: activeDrawContext.techName,
        p_tech_color: activeDrawContext.color,
        p_new_geom: geometry,
      });

      if (error) {
        alert(`Błąd dodawania: ${error.message}`);
        return false;
      }
    } else if (
      activeDrawContext.mode === 'update' &&
      activeDrawContext.sectorId
    ) {
      const { error } = await supabase
        .from('technicians')
        .update({ zone_geometry: geometry })
        .eq('id', activeDrawContext.sectorId);

      if (error) {
        alert(`Błąd aktualizacji: ${error.message}`);
        return false;
      }
    }

    cancelDrawing();
    loadSavedSectors();
    return true;
  };

  const deleteSector = async (id: string) => {
    if (!confirm('Na pewno usunąć ten fragment terytorium?')) return;
    const { error } = await supabase.from('technicians').delete().eq('id', id);
    if (error) alert('Błąd usuwania');
    else loadSavedSectors();
  };

  return (
    <div className="relative w-full h-full bg-slate-50">
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      <ContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onAddStation={(lat, lng) => {
          setModalLatLng({ lat, lng });
          setIsAddModalOpen(true);
        }}
        onEditSector={() => setIsSectorEditorOpen(true)}
      />

      <StationPanel
        station={selectedStation}
        onClose={() => setSelectedStation(null)}
      />

      <AddStationModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setModalLatLng(null);
        }}
        initialLatLng={modalLatLng}
        onSuccess={loadStations}
      />

      <SectorEditor
        isOpen={isSectorEditorOpen}
        onClose={() => {
          setIsSectorEditorOpen(false);
          cancelDrawing();
        }}
        sectors={savedSectorsList}
        isDrawingActive={isDrawingActive}
        onStartDrawingNew={handleStartDrawingNew}
        onEditExisting={handleEditExisting}
        onSaveDrawing={handleSaveDrawing}
        onCancelDrawing={cancelDrawing}
        onDeleteSector={deleteSector}
      />

      <button
        onClick={() => setIsAddModalOpen(true)}
        className="absolute top-6 left-6 z-20 bg-white shadow-xl border border-slate-200 px-5 py-3 rounded-full text-slate-700 font-bold hover:bg-slate-50 hover:text-blue-600 transition-all flex items-center gap-2 text-sm"
      >
        <span>➕</span> Dodaj stację po adresie
      </button>
    </div>
  );
}
