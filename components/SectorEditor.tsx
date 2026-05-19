import React, { useState } from 'react';

export type Sector = {
  id: string;
  name: string;
  color: string;
  geometry?: any;
};

type SectorEditorProps = {
  isOpen: boolean;
  onClose: () => void;
  sectors: Sector[];
  onStartDrawingNew: (
    techName: string,
    color: string,
    mode: 'insert' | 'append'
  ) => void;
  onEditExisting: (sector: Sector) => void;
  onDeleteSector: (id: string) => void;
  isDrawingActive: boolean;
  onSaveDrawing: () => Promise<boolean>;
  onCancelDrawing: () => void;
};

export default function SectorEditor({
  isOpen,
  onClose,
  sectors,
  onStartDrawingNew,
  onEditExisting,
  onDeleteSector,
  isDrawingActive,
  onSaveDrawing,
  onCancelDrawing,
}: SectorEditorProps) {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [isCreatingNewTech, setIsCreatingNewTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechColor, setNewTechColor] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const groupedSectors = sectors.reduce((acc, sector) => {
    if (!acc[sector.name]) {
      acc[sector.name] = { color: sector.color, zones: [] };
    }
    acc[sector.name].zones.push(sector);
    return acc;
  }, {} as Record<string, { color: string; zones: Sector[] }>);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSaveDrawing();
    setIsSaving(false);
    if (success) {
      setIsCreatingNewTech(false);
      setNewTechName('');
    }
  };

  // 1. WIDOK RYSOWANIA
  if (isDrawingActive) {
    return (
      <div className="absolute top-24 left-6 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-2xl shadow-2xl w-[320px]">
        <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
          <span>✍️</span> Tryb Edycji Strefy
        </h3>
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mb-4 text-xs text-blue-800">
          Użyj myszki, aby dopasować obszar. Dwuklik zamyka nowy kształt.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancelDrawing}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2.5 rounded-xl text-sm transition-colors"
          >
            Anuluj
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-md disabled:bg-slate-400"
          >
            {isSaving ? '...' : '💾 Zapisz'}
          </button>
        </div>
      </div>
    );
  }

  // 2. KREATOR NOWEGO TECHNIKA
  if (isCreatingNewTech) {
    return (
      <div className="absolute top-24 left-6 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-2xl shadow-2xl w-[340px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
            Nowy Technik
          </h3>
          <button
            onClick={() => setIsCreatingNewTech(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Imię i nazwisko
            </label>
            <input
              type="text"
              value={newTechName}
              onChange={(e) => setNewTechName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Kolor strefy
            </label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(
                (color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTechColor(color)}
                    style={{ backgroundColor: color }}
                    className={`w-6 h-6 rounded-full ${
                      newTechColor === color
                        ? 'ring-2 ring-slate-800 scale-110'
                        : 'opacity-70'
                    }`}
                  />
                )
              )}
            </div>
          </div>
          <button
            onClick={() => {
              if (!newTechName) return alert('Podaj imię!');
              setSelectedTech(newTechName);
              setIsCreatingNewTech(false);
              onStartDrawingNew(newTechName, newTechColor, 'insert');
            }}
            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-blue-700"
          >
            Narysuj pierwszą strefę
          </button>
        </div>
      </div>
    );
  }

  // 3. WIDOK SZCZEGÓŁÓW TECHNIKA
  if (selectedTech) {
    const techData = groupedSectors[selectedTech];
    if (!techData) {
      setSelectedTech(null);
      return null;
    }

    return (
      <div className="absolute top-24 left-6 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-2xl shadow-2xl w-[340px] max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedTech(null)}
            className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full"
          >
            ←
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-full border border-slate-300"
              style={{ backgroundColor: techData.color }}
            />
            <h3 className="font-bold text-slate-800 text-base">
              {selectedTech}
            </h3>
          </div>
        </div>

        <button
          onClick={() =>
            onStartDrawingNew(selectedTech, techData.color, 'append')
          }
          className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold py-2.5 rounded-xl text-sm mb-4 border border-blue-200 transition-colors"
        >
          + Dorysuj kolejny fragment obszaru
        </button>

        <div className="overflow-y-auto space-y-2 pr-1">
          {techData.zones.map((zone, index) => (
            <div
              key={zone.id}
              className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-xl hover:border-blue-300 transition-colors group"
            >
              <span className="text-sm font-semibold text-slate-700 flex-1">
                Fragment {index + 1}
              </span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEditExisting(zone)}
                  className="text-blue-500 hover:bg-blue-100 p-1.5 rounded-md text-xs"
                  title="Edytuj kształt"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDeleteSector(zone.id)}
                  className="text-red-500 hover:bg-red-100 p-1.5 rounded-md text-xs"
                  title="Usuń fragment"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. GŁÓWNA LISTA TECHNIKÓW
  return (
    <div className="absolute top-24 left-6 z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-2xl shadow-2xl w-[340px] max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <span>🗺️</span> Zasięgi Techników
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>

      <button
        onClick={() => setIsCreatingNewTech(true)}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md mb-6"
      >
        + Utwórz nowego technika
      </button>

      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">
        Zespół ({Object.keys(groupedSectors).length})
      </h4>

      {Object.keys(groupedSectors).length === 0 ? (
        <p className="text-xs text-slate-500 italic">
          Brak techników z przypisanymi strefami.
        </p>
      ) : (
        <div className="overflow-y-auto space-y-2 pr-1">
          {Object.entries(groupedSectors).map(([name, data]) => (
            <div
              key={name}
              onClick={() => setSelectedTech(name)}
              className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-xl cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: data.color }}
                />
                <div>
                  <div className="text-sm font-semibold text-slate-700">
                    {name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {data.zones.length}{' '}
                    {data.zones.length === 1 ? 'fragment' : 'fragmenty'}
                  </div>
                </div>
              </div>
              <span className="text-slate-300 text-xs">Zarządzaj →</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
