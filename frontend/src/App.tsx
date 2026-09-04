import MethodExplorerTab from './tabs/MethodExplorerTab';

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-cyan-500/20 ring-1 ring-white/20">
            <span className="text-white font-black text-sm tracking-wider">DD</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Data Designer
              </h1>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v1.0 Pro
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              산업 공정 설비 데이터 정밀 가공 &amp; 머신러닝 엔지니어링 스튜디오
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-mono text-slate-300">SMD Process Log (5,000 Rows x 19 Cols)</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 flex flex-col gap-6">
        <MethodExplorerTab />
      </main>

      <footer className="border-t border-slate-800/60 bg-slate-900/40 px-6 py-4 text-center text-xs text-slate-500 font-mono">
        Data Designer Studio · Industrial Manufacturing Process Engineering &amp; ML Sandbox
      </footer>
    </div>
  );
}
