import React, { useState, useMemo } from 'react';

// Ikony Ekoen
const IconChevronLeft = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconChevronRight = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;

type Event = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'inspection' | 'repair' | 'other';
  technician: string;
};

// Przykładowe dane wstrzyknięte do kalendarza
const mockEvents: Event[] = [
  { id: '1', date: '2026-05-12', title: 'Przegląd kwartalny', type: 'inspection', technician: 'Jan Kowalski' },
  { id: '2', date: '2026-05-15', title: 'Wymiana modułu (TKT-102)', type: 'repair', technician: 'Piotr Nowak' },
  { id: '3', date: '2026-05-20', title: 'Audyt UDT', type: 'inspection', technician: 'Jan Kowalski' },
  { id: '4', date: '2026-05-20', title: 'Usterka ekranu (TKT-334)', type: 'repair', technician: 'Adam Wiśniewski' },
  { id: '5', date: '2026-05-28', title: 'Instalacja nowego punktu', type: 'other', technician: 'Zespół A' },
];

const WEEKDAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 20)); // Kontekst: Maj 2026
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);

  // Funkcje nawigacyjne
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  // Generowanie dni do siatki
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Obliczanie przesunięcia dla pierwszego dnia miesiąca (0=Ndz, 1=Pon... konwersja na Pon-Ndz)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days = [];
    
    // Dni z poprzedniego miesiąca
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({ day: daysInPrevMonth - i, isCurrentMonth: false, dateString: '' });
    }
    
    // Dni z obecnego miesiąca
    for (let i = 1; i <= daysInMonth; i++) {
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, isCurrentMonth: true, dateString });
    }
    
    // Dopełnienie do pełnej siatki (42 komórki = 6 tygodni)
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({ day: i, isCurrentMonth: false, dateString: '' });
    }

    return days;
  }, [currentDate]);

  const getEventBadgeClass = (type: string) => {
    switch (type) {
      case 'inspection': return 'bg-green-100 text-green-800 border-green-200';
      case 'repair': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 flex flex-col h-full overflow-hidden">
      
      {/* Nagłówek Kalendarza */}
      <div className="max-w-[1400px] w-full mx-auto flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconCalendar /> Harmonogram Operacyjny
          </h1>
          <p className="text-sm text-slate-500 mt-1">Zarządzaj terminami przeglądów, napraw i dostępnością techników.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200"><IconChevronLeft /></button>
            <button onClick={goToday} className="px-4 py-2 font-semibold text-sm text-slate-700 hover:bg-slate-50 transition-colors">Dziś</button>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200"><IconChevronRight /></button>
          </div>
          <h2 className="text-xl font-black text-[#58b347] w-48 text-center">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button 
            onClick={() => setIsAddEventOpen(true)}
            className="bg-[#58b347] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors ml-2"
          >
            <IconPlus /> Zaplanuj zadanie
          </button>
        </div>
      </div>

      {/* Siatka Kalendarza */}
      <div className="max-w-[1400px] w-full mx-auto flex-1 flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mb-8">
        
        {/* Dni Tygodnia (Nagłówek Siatki) */}
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 shrink-0">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200 last:border-r-0">
              {day}
            </div>
          ))}
        </div>

        {/* Komórki Dni */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {calendarDays.map((cell, idx) => {
            const isToday = cell.dateString === new Date().toISOString().split('T')[0];
            const dayEvents = mockEvents.filter(e => e.date === cell.dateString);

            return (
              <div 
                key={idx} 
                className={`border-r border-b border-slate-100 p-2 min-h-[100px] flex flex-col transition-colors
                  ${!cell.isCurrentMonth ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}
                  ${idx % 7 === 6 ? 'border-r-0' : ''}
                `}
              >
                {/* Numer dnia */}
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-[#58b347] text-white shadow-md' : (cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-400')}
                  `}>
                    {cell.day}
                  </span>
                </div>

                {/* Zdarzenia w tym dniu */}
                <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide mt-1">
                  {cell.isCurrentMonth && dayEvents.map(event => (
                    <div 
                      key={event.id} 
                      className={`text-xs p-1.5 rounded border shadow-sm truncate cursor-pointer hover:opacity-80 transition-opacity ${getEventBadgeClass(event.type)}`}
                      title={`${event.title} - ${event.technician}`}
                    >
                      <span className="font-bold block truncate">{event.title}</span>
                      <span className="opacity-80 truncate block">{event.technician}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL: DODAJ WYDARZENIE */}
      {isAddEventOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setIsAddEventOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Zaplanuj nowe zadanie</h3>
              <button onClick={() => setIsAddEventOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tytuł zdarzenia *</label>
                <input type="text" placeholder="np. Przegląd UDT" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
                  <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Typ zadania</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                    <option value="inspection">Przegląd / UDT</option>
                    <option value="repair">Naprawa awarii</option>
                    <option value="other">Inne zadanie</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Przypisz technika</label>
                <select className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                  <option value="">Wybierz...</option>
                  <option value="Jan Kowalski">Jan Kowalski</option>
                  <option value="Piotr Nowak">Piotr Nowak</option>
                </select>
              </div>
              <div className="pt-4 flex gap-2">
                <button onClick={() => setIsAddEventOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded hover:bg-slate-200 transition-colors text-sm">Anuluj</button>
                <button className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded hover:bg-[#499b3a] transition-colors text-sm">Zapisz w kalendarzu</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}