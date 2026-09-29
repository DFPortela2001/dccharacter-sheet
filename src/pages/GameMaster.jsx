import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LOOT_TABLES, rollLoot } from "@/lib/lootTables";
import GmPinLock from "@/components/gm/GmPinLock";
import EnemyTracker from "@/components/gm/EnemyTracker";
import DifficultyChecker from "@/components/gm/DifficultyChecker";
import CheckCalculator from "@/components/gm/CheckCalculator";
import { ArrowLeft, Dices, NotebookPen, Sparkles, Lock } from "lucide-react";

const NOTES_KEY = "gm_notes";
const GM_PIN = "1234";
const GM_UNLOCK_KEY = "gm_unlocked";

export default function GameMaster() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [history, setHistory] = useState([]);
  const [junkQty, setJunkQty] = useState(1);
  const [junkResult, setJunkResult] = useState(null);
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(GM_UNLOCK_KEY) === "1");

  useEffect(() => {
    setNotes(localStorage.getItem(NOTES_KEY) || "");
  }, []);

  if (!unlocked) {
    return <GmPinLock correctPin={GM_PIN} onUnlock={() => { sessionStorage.setItem(GM_UNLOCK_KEY, "1"); setUnlocked(true); }} />;
  }

  const saveNotes = (value) => {
    setNotes(value);
    localStorage.setItem(NOTES_KEY, value);
  };

  const handleRoll = (table) => {
    const { roll, result, gold } = rollLoot(table);
    setHistory((prev) => [
      { id: Date.now(), table: table.name, roll, result, gold },
      ...prev,
    ].slice(0, 20));
  };

  const rollJunk = () => {
    const n = Math.max(1, Math.min(50, Number(junkQty) || 1));
    const rolls = Array.from({ length: n }, () => Math.floor(Math.random() * 6) + 1);
    setJunkResult({ rolls, total: rolls.reduce((a, b) => a + b, 0) });
  };

  return (
    <div className="min-h-screen grunge-paper">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="sticky top-0 z-20 grunge-paper -mx-4 px-4 py-3 mb-4 border-b-2 border-black flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:text-red-800"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <h1 className="text-sm font-black uppercase tracking-[0.2em] hidden sm:block">Game Master</h1>
          <button
            onClick={() => { sessionStorage.removeItem(GM_UNLOCK_KEY); setUnlocked(false); }}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider hover:text-red-800"
            title="Bloquear"
          >
            <Lock className="w-3.5 h-3.5" /> Bloquear
          </button>
        </div>

        <header className="flex items-center gap-3 border-b-4 border-black pb-4 mb-6">
          <Dices className="w-10 h-10 text-red-800" />
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight leading-none">Game Master Tools</h2>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/60">Notas · Loot · Rastreio</p>
          </div>
        </header>

        {/* Notes */}
        <section className="border-2 border-black bg-[#e9e7e2]/70 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <NotebookPen className="w-4 h-4" />
            <span className="grunge-section-title">Notas da Sessão</span>
          </div>
          <textarea
            className="grunge-field w-full min-h-[140px] resize-y"
            value={notes}
            onChange={(e) => saveNotes(e.target.value)}
            placeholder="Escreve notas da sessão, ideias, NPCs, eventos..."
          />
          <p className="text-[10px] font-mono text-black/50 mt-1">Guardado automaticamente neste dispositivo.</p>
        </section>

        {/* Loot tables */}
        <section className="border-2 border-black bg-[#e9e7e2]/70 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4" />
            <span className="grunge-section-title">Loot Tables</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LOOT_TABLES.map((table) => (
              <div key={table.id} className="border border-black/60 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black uppercase tracking-wide">{table.name}</span>
                  <span className="text-[10px] font-mono text-black/50">1d{table.die} · +{table.gold?.label}</span>
                </div>
                <button
                  onClick={() => handleRoll(table)}
                  className="w-full flex items-center justify-center gap-2 border-2 border-black px-3 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-red-800 hover:text-white hover:border-red-800"
                >
                  <Dices className="w-4 h-4" /> Rolar
                </button>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <div className="mt-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Resultados Recentes</div>
              <div className="space-y-1">
                {history.map((h) => (
                  <div key={h.id} className="border-b border-black/15 py-1 text-xs font-mono">
                    <span className="grunge-red font-black">[{h.table} · {h.roll}]</span> {h.result}
                    {h.gold && (
                      <span className="block text-black/60">+ {h.gold.amount.toLocaleString()} Gold ({h.gold.label}: {h.gold.roll})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Misc Junk */}
        <section className="border-2 border-black bg-[#e9e7e2]/70 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Dices className="w-4 h-4" />
            <span className="grunge-section-title">Misc Junk</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center border-2 border-black">
              <button
                onClick={() => setJunkQty((q) => Math.max(1, (Number(q) || 1) - 1))}
                className="px-2.5 py-1.5 text-sm font-black hover:bg-black hover:text-white"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={50}
                value={junkQty}
                onChange={(e) => setJunkQty(e.target.value)}
                className="grunge-field w-16 text-center border-0 border-x-2 border-black"
              />
              <button
                onClick={() => setJunkQty((q) => Math.min(50, (Number(q) || 1) + 1))}
                className="px-2.5 py-1.5 text-sm font-black hover:bg-black hover:text-white"
              >
                +
              </button>
            </div>
            <span className="text-xs font-mono text-black/50">× d6</span>
            <button
              onClick={rollJunk}
              className="flex items-center gap-2 border-2 border-black px-4 py-1.5 text-xs font-black uppercase tracking-wider hover:bg-red-800 hover:text-white hover:border-red-800"
            >
              <Dices className="w-4 h-4" /> Rolar Junk
            </button>
          </div>
          {junkResult && (
            <div className="mt-3 border border-black/50 p-2">
              <div className="flex flex-wrap gap-1 mb-1">
                {junkResult.rolls.map((r, i) => (
                  <span key={i} className="grunge-field w-7 h-7 flex items-center justify-center text-center font-black bg-black/5">
                    {r}
                  </span>
                ))}
              </div>
              <div className="text-xs font-mono">
                <span className="font-bold uppercase">Total:</span>{" "}
                <span className="grunge-red font-black text-lg">{junkResult.total}</span>
              </div>
            </div>
          )}
        </section>

        {/* Check Calculator */}
        <CheckCalculator />

        {/* Difficulty Checker */}
        <DifficultyChecker />

        {/* Enemies */}
        <EnemyTracker />
      </div>
    </div>
  );
}