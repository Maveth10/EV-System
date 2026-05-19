import React from 'react';

export const EkoenIcon = ({ className = "w-8 h-8", spinning = false }) => (
  <svg viewBox="0 0 200 200" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Zewnętrzne pierścienie (statyczne) */}
    <path d="M100 10C149.706 10 190 50.2944 190 100C190 149.706 149.706 190 100 190C50.2944 190 10 149.706 10 100C10 50.2944 50.2944 10 100 10Z" stroke="#58b347" strokeWidth="12" />
    <line x1="100" y1="10" x2="100" y2="35" stroke="white" strokeWidth="8" />
    <line x1="100" y1="165" x2="100" y2="190" stroke="white" strokeWidth="8" />
    
    {/* Wnętrze - to się kręci */}
    <g className={spinning ? "animate-spin-slow origin-center" : ""}>
      <circle cx="100" cy="100" r="70" fill="#58b347" />
      <path d="M85 70H135V85H85V70ZM65 92.5H115V107.5H65V92.5ZM85 115H135V130H85V115Z" fill="white" />
    </g>
    
    <style jsx>{`
      @keyframes spin-slow {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin-slow {
        animation: spin-slow 2s linear infinite;
        transform-box: fill-box;
        transform-origin: center;
      }
    `}</style>
  </svg>
);

export const LoadingScreen = () => (
  <div className="fixed inset-0 z-[1000] bg-white flex flex-col items-center justify-center">
    <EkoenIcon className="w-32 h-32 mb-6" spinning={true} />
    <h2 className="text-xl font-bold text-slate-800 animate-pulse tracking-widest">EKOEN SYSTEM</h2>
    <p className="text-slate-400 text-sm mt-2">Inicjalizacja floty ładowarek...</p>
  </div>
);