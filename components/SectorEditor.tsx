import React, { useState } from 'react';

export type Sector = { id: string; name: string; color: string; geometry?: any; };

type SectorEditorProps = {
  isOpen: boolean; onClose: () => void; sectors: Sector[];
  onStartDrawingNew: (techName: string, color: string, mode: 'insert' | 'append') => void;
  onEditExisting: (sector: Sector) => void; onDeleteSector: (id: string) => void;
  isDrawingActive: boolean; onSaveDrawing: () => Promise<boolean>; onCancelDrawing: () => void;
};

const IconMap = () => <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>;
const IconDraw = () => <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg>;
const IconSave = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconTrash = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconArrowLeft = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconClose = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

export default function SectorEditor({ isOpen, onClose, sectors, onStartDrawingNew, onEditExisting, onDeleteSector, isDrawingActive, onSaveDrawing, onCancelDrawing }: SectorEditorProps) {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [isCreatingNewTech, setIsCreatingNewTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechColor, setNewTechColor] = useState('#3b82f6');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const groupedSectors = sectors.reduce((acc, sector) => {
    if (!acc[sector.name]) acc[sector.name] = { color: sector.color, zones: [] };
    acc[sector.name].zones.push(sector);
    return acc;
  }, {} as Record<string, { color: string, zones: Sector[] }>);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSaveDrawing();
    setIsSaving(false);
    if (success) { setIsCreatingNewTech(false); setNewTechName(''); }
  };

  if (isDrawingActive) {
    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-lg shadow-xl w-[320px]">
        <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2"><IconDraw /> Tryb edycji strefy</h3>
        <div className="bg-blue-50 border border-blue-100 p-3 rounded text-xs text-blue-800 mb-4">Użyj wskaźnika, aby wyznaczyć obszar. Zakończ podwójnym kliknięciem.</div>
        <div className="flex gap-2">
          <button onClick={onCancelDrawing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded text-sm transition-colors border border-slate-200">Anuluj</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded text-sm transition-colors disabled:bg-slate-400"><IconSave /> {isSaving ? 'Zapis...' : 'Zapisz'}</button>
        </div>
      </div>
    );
  }

  if (isCreatingNewTech) {
    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-lg shadow-xl w-[340px]">
         <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Nowy zasób techniczny</h3>
          <button onClick={() => setIsCreatingNewTech(false)} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Identyfikator / Imię i nazwisko</label>
            <input type="text" value={newTechName} onChange={(e) => setNewTechName(e.target.value)} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kolor operacyjny</label>
            <div className="flex gap-2">
              {['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                <button key={color} type="button" onClick={() => setNewTechColor(color)} style={{ backgroundColor: color }} className={`w-6 h-6 rounded ${newTechColor === color ? 'ring-2 ring-slate-800 scale-105' : 'opacity-70'}`} />
              ))}
            </div>
          </div>
          <button onClick={() => {
            if(!newTechName) return alert('Wprowadź identyfikator.');
            setSelectedTech(newTechName);
            setIsCreatingNewTech(false);
            onStartDrawingNew(newTechName, newTechColor, 'insert');
          }} className="w-full bg-blue-600 text-white font-medium py-2.5 rounded text-sm hover:bg-blue-700 transition-colors">Rozpocznij wyznaczanie</button>
        </div>
      </div>
    );
  }

  if (selectedTech) {
    const techData = groupedSectors[selectedTech];
    if (!techData) { setSelectedTech(null); return null; }

    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-5 rounded-lg shadow-xl w-[340px] max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
          <button onClick={() => setSelectedTech(null)} className="text-slate-400 hover:text-slate-600 text-lg"><IconArrowLeft /></button>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: techData.color }} />
            <h3 className="font-semibold text-slate-800 text-sm">{selectedTech}</h3>
          </div>
        </div>
        <button onClick={() => onStartDrawingNew(selectedTech, techData.color, 'append')} className="w-full bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium py-2 rounded text-sm mb-4 transition-colors flex items-center justify-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Dodaj nowy fragment
        </button>
        <div className="overflow-y-auto space-y-2 pr-1">
          {techData.zones.map((zone, index) => (
            <div key={zone.id} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded hover:border-slate-300 transition-colors group">
              <span className="text-xs font-medium text-slate-600 flex-1">Fragment {index + 1}</span>
              <div className="flex gap-2">
                <button onClick={() => onEditExisting(zone)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-colors"><IconEdit /></button>
                <button onClick={() => onDeleteSector(zone.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"><IconTrash /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-5 rounded-lg shadow-xl w-[340px] max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><IconMap /> Zarządzanie strefami</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
      </div>
      <button onClick={() => setIsCreatingNewTech(true)} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded text-sm transition-colors mb-5">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Dodaj technika
      </button>
      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Przypisane zasoby ({Object.keys(groupedSectors).length})</h4>
      {Object.keys(groupedSectors).length === 0 ? (
        <p className="text-xs text-slate-500">Brak zdefiniowanych stref.</p>
      ) : (
        <div className="overflow-y-auto space-y-2 pr-1">
          {Object.entries(groupedSectors).map(([name, data]) => (
            <div key={name} onClick={() => setSelectedTech(name)} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                <div>
                  <div className="text-xs font-medium text-slate-700">{name}</div>
                  <div className="text-[10px] text-slate-400">{data.zones.length} {data.zones.length === 1 ? 'fragment' : 'fragmenty'}</div>
                </div>
              </div>
              <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}