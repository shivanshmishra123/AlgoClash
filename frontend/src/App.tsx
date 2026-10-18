export default function App() {
  return (
    <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-8 font-mono">
      <h1 className="text-4xl font-bold tracking-widest text-[#00ffcc] mb-4 drop-shadow-[0_0_15px_rgba(0,255,204,0.6)]">
        ALGOCLASH
      </h1>
      <p className="text-slate-400 text-lg mb-8">
        Real-Time 1v1 Algorithmic Combat &amp; Tournament Arena
      </p>
      <div className="border border-cyan-500/30 bg-slate-900/40 rounded-lg p-6 max-w-md w-full text-center">
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 mb-3">
          SYSTEM ONLINE
        </span>
        <p className="text-sm text-slate-300">
          Scaffolding initialized. Ready for match orchestration.
        </p>
      </div>
    </div>
  );
}
