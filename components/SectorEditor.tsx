import React, { useState, useEffect } from 'react';

export type Sector = { id: string; name: string; color: string; geometry?: any; };

type SectorEditorProps = {
  isOpen: boolean; onClose: () => void; 
  sectors: Sector[]; regions: Sector[];
  onStartDrawingNew: (name: string, color: string, mode: 'insert' | 'append' | 'update', targetType: 'technician' | 'region', sectorId?: string) => void;
  onEditExisting: (sector: Sector, targetType: 'technician' | 'region', appendMode?: boolean) => void; 
  onDeleteSector: (id: string, targetType: 'technician' | 'region') => void;
  isDrawingActive: boolean; onSaveDrawing: () => Promise<boolean>; onCancelDrawing: () => void;
  drawMethod: 'manual' | 'click'; onSetDrawMethod: (method: 'manual' | 'click') => void;
  onSelectAllPoland: () => void;
};

const IconMap = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>;
const IconDraw = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z"/><path d="m14 7 3 3"/></svg>;
const IconSave = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconTrash = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconArrowLeft = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconClose = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconPlus = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;

export default function SectorEditor({ isOpen, onClose, sectors, regions, onStartDrawingNew, onEditExisting, onDeleteSector, isDrawingActive, onSaveDrawing, onCancelDrawing, drawMethod, onSetDrawMethod, onSelectAllPoland }: SectorEditorProps) {
  const [activeTab, setActiveTab] = useState<'technicians' | 'regions'>('technicians');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#58b347');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isDrawingActive) onCancelDrawing();
        else if (isCreatingNew) setIsCreatingNew(false);
        else if (selectedItem) setSelectedItem(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDrawingActive, isCreatingNew, selectedItem, onClose, onCancelDrawing]);

  if (!isOpen) return null;

  const currentList = activeTab === 'technicians' ? sectors : regions;
  const groupedItems = currentList.reduce((acc, item) => {
    if (!acc[item.name]) acc[item.name] = { id: item.id, color: item.color, zones: [] };
    if (item.geometry) acc[item.name].zones.push(item);
    return acc;
  }, {} as Record<string, { id: string, color: string, zones: Sector[] }>);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSaveDrawing();
    setIsSaving(false);
    if (success) { setIsCreatingNew(false); setNewName(''); }
  };

  if (isDrawingActive) {
    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-lg shadow-xl w-[320px]">
        <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2"><IconDraw /> Ustawianie terytorium</h3>
        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
          <button onClick={() => onSetDrawMethod('manual')} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${drawMethod === 'manual' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}>Rysuj odręcznie</button>
          <button onClick={() => onSetDrawMethod('click')} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${drawMethod === 'click' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}>Wybierz region</button>
        </div>
        <div className="bg-green-50 border border-green-100 p-3 rounded text-xs text-green-800 mb-4 leading-relaxed">
          {drawMethod === 'manual' ? "Wyklikaj myszką obszar. Zostanie on automatycznie przycięty do granic państwa i zaznaczonych województw." : "Klikaj w wybrane województwa, aby je zaznaczyć."}
          {drawMethod === 'click' && <button onClick={onSelectAllPoland} className="w-full mt-3 bg-white border border-green-200 hover:bg-green-100 text-[#58b347] font-bold py-1.5 rounded transition-colors text-center shadow-sm">+ Zaznacz całą Polskę</button>}
        </div>
        <div className="flex gap-2">
          <button onClick={onCancelDrawing} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded text-sm transition-colors border border-slate-200">Anuluj</button>
          <button onClick={handleSave} disabled={isSaving} className="flex-1 flex items-center justify-center gap-2 bg-[#58b347] hover:bg-[#499b3a] text-white font-medium py-2 rounded text-sm transition-colors disabled:bg-slate-400 shadow-sm"><IconSave /> {isSaving ? 'Zapis...' : 'Zapisz'}</button>
        </div>
      </div>
    );
  }

  if (isCreatingNew) {
    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-6 rounded-lg shadow-xl w-[340px]">
         <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">Nowy {activeTab === 'technicians' ? 'technik' : 'region'}</h3>
          <button onClick={() => setIsCreatingNew(false)} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
        </div>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium text-slate-500 mb-1">Nazwa</label><input type="text" autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full px-3 py-2 border rounded text-sm focus:outline-none focus:border-[#58b347]" /></div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Kolor na mapie</label>
            <div className="flex items-center gap-3"><input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-10 p-0.5 border border-slate-200 rounded cursor-pointer" /><span className="text-xs text-slate-500 font-mono uppercase">{newColor}</span></div>
          </div>
          <button onClick={() => { if(!newName) return alert('Wprowadź nazwę.'); setSelectedItem(newName); setIsCreatingNew(false); onStartDrawingNew(newName, newColor, 'insert', activeTab === 'technicians' ? 'technician' : 'region'); }} className="w-full bg-[#58b347] text-white font-medium py-2.5 rounded text-sm hover:bg-[#499b3a] transition-colors shadow-sm">Utwórz i narysuj strefę</button>
        </div>
      </div>
    );
  }

  if (selectedItem) {
    const itemData = groupedItems[selectedItem];
    if (!itemData) { setSelectedItem(null); return null; }

    return (
      <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-5 rounded-lg shadow-xl w-[340px] max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-3 mb-5 border-b border-slate-100 pb-3">
          <button onClick={() => setSelectedItem(null)} className="text-slate-400 hover:text-slate-600 text-lg"><IconArrowLeft /></button>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: itemData.color }} /><h3 className="font-semibold text-slate-800 text-sm">{selectedItem}</h3></div>
        </div>

        {itemData.zones.length === 0 ? (
          <div className="text-center bg-slate-50 border border-slate-200 p-4 rounded-lg mb-4">
            <p className="text-xs text-slate-500 mb-3">Ten obiekt nie ma przypisanego terytorium.</p>
            <button onClick={() => onStartDrawingNew(selectedItem, itemData.color, 'update', activeTab === 'technicians' ? 'technician' : 'region', itemData.id)} className="w-full bg-[#58b347] text-white hover:bg-[#499b3a] font-medium py-2 rounded text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"><IconDraw /> Narysuj strefę</button>
          </div>
        ) : (
          <div className="overflow-y-auto space-y-3 pr-1">
            {itemData.zones.map((zone) => (
              <div key={zone.id} className="bg-white border border-slate-200 p-3 rounded hover:border-slate-300 transition-colors group">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex-1">Obszar zdefiniowany</span>
                  <div className="flex gap-2">
                    <button onClick={() => onEditExisting(zone, activeTab === 'technicians' ? 'technician' : 'region')} className="text-[#58b347] hover:bg-green-50 p-1.5 rounded transition-colors" title="Edytuj granice"><IconEdit /></button>
                    <button onClick={() => onDeleteSector(zone.id, activeTab === 'technicians' ? 'technician' : 'region')} className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors" title="Wyczyść cały obszar"><IconTrash /></button>
                  </div>
                </div>
                <button onClick={() => onEditExisting(zone, activeTab === 'technicians' ? 'technician' : 'region', true)} className="w-full bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-medium py-2 rounded transition-colors flex items-center justify-center gap-2">
                  <IconPlus /> Doklej kolejny obszar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="absolute top-20 left-[96px] z-30 bg-white/95 backdrop-blur-md border border-slate-200 p-5 rounded-lg shadow-xl w-[340px] max-h-[80vh] flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2"><IconMap /> Edytor Terytoriów</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><IconClose /></button>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-lg mb-5">
        <button onClick={() => setActiveTab('technicians')} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${activeTab === 'technicians' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}>Technicy</button>
        <button onClick={() => setActiveTab('regions')} className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${activeTab === 'regions' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}>Regiony</button>
      </div>

      <button onClick={() => setIsCreatingNew(true)} className="w-full flex items-center justify-center gap-2 bg-[#58b347] hover:bg-[#499b3a] text-white font-medium py-2.5 rounded text-sm transition-colors mb-5 shadow-sm">
        <IconPlus /> Utwórz nowy {activeTab === 'technicians' ? 'zespół' : 'region'}
      </button>

      <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Lista ({Object.keys(groupedItems).length})</h4>
      {Object.keys(groupedItems).length === 0 ? (
        <p className="text-xs text-slate-500">Brak obiektów w bazie.</p>
      ) : (
        <div className="overflow-y-auto space-y-2 pr-1">
          {Object.entries(groupedItems).map(([name, data]) => (
            <div key={name} onClick={() => setSelectedItem(name)} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} /><div><div className="text-xs font-medium text-slate-700">{name}</div><div className={`text-[10px] font-medium ${data.zones.length > 0 ? 'text-[#58b347]' : 'text-slate-400'}`}>{data.zones.length > 0 ? '✓ Strefa aktywna' : 'Brak przypisanej strefy'}</div></div></div><IconArrowLeft />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}