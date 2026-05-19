import React, { useState, useEffect } from 'react';

export type Sector = { id: string; name: string; color: string; geometry?: any; };

type SectorEditorProps = {
  isOpen: boolean; onClose: () => void; sectors: Sector[];
  onStartDrawingNew: (techName: string, color: string, mode: 'insert' | 'append' | 'update', sectorId?: string) => void;
  onEditExisting: (sector: Sector) => void; onDeleteSector: (id: string) => void;
  isDrawingActive: boolean; onSaveDrawing: () => Promise<boolean>; onCancelDrawing: () => void;
};

const IconMap = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>;
const IconDraw = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg>;
const IconSave = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconTrash = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconArrowLeft = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconClose = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;

export default function SectorEditor({ isOpen, onClose, sectors, onStartDrawingNew, onEditExisting, onDeleteSector, isDrawingActive, onSaveDrawing, onCancelDrawing }: SectorEditorProps) {
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [isCreatingNewTech, setIsCreatingNewTech] = useState(false);
  const [newTechName, setNewTechName] = useState('');
  const [newTechColor, setNewTechColor] = useState('#58b347');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDrawingActive) {
          onCancelDrawing();
        } else if (isCreatingNewTech) {
          setIsCreatingNewTech(false);
        } else if (selectedTech) {
          setSelectedTech(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDrawingActive, isCreatingNewTech, selectedTech, onClose, onCancelDrawing]);

  if (!isOpen) return null;

  const groupedSectors = sectors.reduce((acc, sector) => {
    if (!acc[sector.name]) acc[sector.name] = { id: sector.id, color: sector.color, zones: [] };
    if (sector.geometry) acc[sector.name].zones.push(sector);
    return acc;
  }, {} as Record<string, { id: string, color: string, zones: Sector[] }>);

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
        <div className="bg-green-50 border border-green-100 p-3 rounded text-xs text-green-800 mb-4">Użyj wskaźnika, aby wyznaczyć obszar. Zakończ podwójnym kliknięciem. ESC anuluje.</div>
        <div className="flex gap-2">
          <button onClick={onCancelDrawing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded text-sm transition-colors border border-slate-200">Anuluj</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-[#58b347] hover:bg-[#499b3a] text-white font-medium py-2 rounded text-sm transition-colors disabled:bg-slate-400"><IconSave /> {isSaving ? 'Zapis...' : 'Zapisz'}</button>
        </div>
      </div>
    );
  }

  if (isCreatingNewTech) {
    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-lg shadow-xl w-[340px]">
         <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Nowy technik operacyjny</h3>
          <button onClick={() => setIsCreatingNewTech(false)} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Identyfikator (Imię i nazwisko)</label>
            <input type="text" autoFocus value={newTechName} onChange={(e) => setNewTechName(e.target.value)} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#58b347]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kolor strefy na mapie</label>
            <div className="flex items-center gap-3">
              <input type="color" value={newTechColor} onChange={(e) => setNewTechColor(e.target.value)} className="w-10 h-10 p-0.5 border border-slate-200 rounded cursor-pointer" />
              <span className="text-xs text-slate-500 font-mono uppercase">{newTechColor}</span>
            </div>
          </div>
          <button onClick={() => {
            if(!newTechName) return alert('Wprowadź identyfikator.');
            setSelectedTech(newTechName);
            setIsCreatingNewTech(false);
            onStartDrawingNew(newTechName, newTechColor, 'insert');
          }} className="w-full bg-[#58b347] text-white font-medium py-2.5 rounded text-sm hover:bg-[#499b3a] transition-colors">Utwórz i narysuj strefę</button>
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

        {techData.zones.length === 0 ? (
          <div className="text-center bg-slate-50 border border-slate-200 p-4 rounded-lg mb-4">
            <p className="text-xs text-slate-500 mb-3">Ten technik nie ma jeszcze przypisanego terytorium roboczego.</p>
            <button onClick={() => onStartDrawingNew(selectedTech, techData.color, 'update', techData.id)} className="w-full bg-[#58b347] text-white hover:bg-[#499b3a] font-medium py-2 rounded text-sm transition-colors flex items-center justify-center gap-2">
              <IconDraw /> Narysuj pierwszą strefę
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-2 pr-1">
            {techData.zones.map((zone, index) => (
              <div key={zone.id} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded hover:border-slate-300 transition-colors group">
                <span className="text-xs font-medium text-slate-600 flex-1">Główny obszar operacyjny</span>
                <div className="flex gap-2">
                  <button onClick={() => onEditExisting(zone)} className="text-[#58b347] hover:bg-green-50 p-1.5 rounded transition-colors" title="Edytuj granice obszaru"><IconEdit /></button>
                  <button onClick={() => onDeleteSector(zone.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors" title="Wyczyść obszar technika"><IconTrash /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-5 rounded-lg shadow-xl w-[340px] max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-5">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><IconMap /> Obszary operacyjne</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
      </div>
      <button onClick={() => setIsCreatingNewTech(true)} className="w-full flex items-center justify-center gap-2 bg-[#58b347] hover:bg-[#499b3a] text-white font-medium py-2.5 rounded text-sm transition-colors mb-5">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Utwórz nowego technika
      </button>
      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Wszyscy technicy w bazie ({Object.keys(groupedSectors).length})</h4>
      {Object.keys(groupedSectors).length === 0 ? (
        <p className="text-xs text-slate-500">Brak techników. Dodaj kogoś do bazy.</p>
      ) : (
        <div className="overflow-y-auto space-y-2 pr-1">
          {Object.entries(groupedSectors).map(([name, data]) => (
            <div key={name} onClick={() => setSelectedTech(name)} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                <div>
                  <div className="text-xs font-medium text-slate-700">{name}</div>
                  <div className={`text-[10px] font-medium ${data.zones.length > 0 ? 'text-[#58b347]' : 'text-slate-400'}`}>
                    {data.zones.length > 0 ? '✓ Przypisano strefę' : 'Brak przypisanej strefy'}
                  </div>
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