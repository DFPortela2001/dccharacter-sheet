import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Skull, Plus, FileText, Trash2, Loader2, Dices } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.Character.list("-updated_date", 50);
      setCharacters(list);
    } catch (e) {
      setCharacters([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Eliminar esta ficha de personagem?")) return;
    await base44.entities.Character.delete(id);
    load();
  };

  const loading = characters === null;

  return (
    <div className="min-h-screen grunge-paper">
      <div className="max-w-4xl mx-auto px-4 py-10">
        <header className="flex items-center justify-between border-b-4 border-black pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Skull className="w-10 h-10 text-red-800" />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight leading-none">Dungeon Crawler Carl</h1>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-black/60">Gerador de Fichas de Personagem</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate("/gm")}
              className="flex items-center gap-2 border-2 border-black px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-black hover:text-white transition-colors"
            >
              <Dices className="w-4 h-4" /> Game Master
            </button>
            <button
              onClick={() => navigate("/wizard")}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-red-800 transition-colors"
            >
              <Plus className="w-4 h-4" /> Nova Ficha
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-black/40" />
          </div>
        ) : characters.length === 0 ? (
          <div className="border-2 border-dashed border-black/40 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-black/30 mb-3" />
            <p className="text-sm font-bold uppercase tracking-wider text-black/50 mb-4">Ainda não há fichas criadas</p>
            <button
              onClick={() => navigate("/wizard")}
              className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-red-800"
            >
              <Plus className="w-4 h-4" /> Criar primeira ficha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {characters.map((ch) => (
              <div key={ch.id} className="border-2 border-black bg-[#e9e7e2]/70 p-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black uppercase leading-none">{ch.name || "Sem nome"}</h3>
                  <p className="text-xs font-mono text-black/60 mt-1">
                    {ch.race || "?"} · {ch.character_class || "?"} · Nível {ch.level || 1}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigate(`/editor/${ch.id}`)}
                    className="border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white"
                  >
                    Abrir
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="border-2 border-black p-1.5 hover:bg-red-800 hover:text-white hover:border-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}