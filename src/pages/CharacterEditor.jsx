import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createEmptyCharacter, setNested } from "@/lib/characterDefaults";
import { exportToPdf } from "@/lib/pdfExport";
import HeaderSection from "@/components/character/HeaderSection";
import CoreStatsSection from "@/components/character/CoreStatsSection";
import CombatSection from "@/components/character/CombatSection";
import AttacksSection from "@/components/character/AttacksSection";
import GearSection from "@/components/character/GearSection";
import SkillsSection from "@/components/character/SkillsSection";
import InventorySection from "@/components/character/InventorySection";
import JournalSection from "@/components/character/JournalSection";
import PrintSheet from "@/components/character/PrintSheet";
import DiceRoller from "@/components/character/DiceRoller";
import { ArrowLeft, Save, Download, Loader2 } from "lucide-react";

const TABS = [
  { id: "sheet", label: "Sheet" },
  { id: "attacks", label: "Attacks" },
  { id: "skills", label: "Skills" },
  { id: "spells", label: "Spells" },
  { id: "companions", label: "Companions" },
  { id: "gear", label: "Gear" },
  { id: "inventory", label: "Inventory" },
  { id: "journal", label: "Journal" },
];

function TabPlaceholder({ label }) {
  return (
    <div className="border border-black/30 bg-white/40 p-8 text-center">
      <p className="text-sm font-mono text-black/40 uppercase tracking-wider">{label} — coming soon</p>
    </div>
  );
}

export default function CharacterEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [character, setCharacter] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedId, setSavedId] = useState(id || null);
  const [tab, setTab] = useState("sheet");

  useEffect(() => {
    if (id) {
      base44.entities.Character.get(id).then((c) => {
        setCharacter({ ...createEmptyCharacter(), ...c });
      }).catch(() => {
        setCharacter(createEmptyCharacter());
      });
    } else {
      setCharacter(createEmptyCharacter());
    }
  }, [id]);

  if (!character) {
    return (
      <div className="min-h-screen grunge-paper flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black/40" />
      </div>
    );
  }

  const handleChange = (path, value) => {
    setCharacter((prev) => setNested(prev, path, value));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { id: _omit, created_date, updated_date, created_by_id, ...data } = character;
      if (savedId) {
        await base44.entities.Character.update(savedId, data);
      } else {
        const created = await base44.entities.Character.create(data);
        setSavedId(created.id);
        navigate(`/editor/${created.id}`, { replace: true });
      }
    } catch (e) {
      alert("Erro ao guardar: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const filename = `${(character.name || "crawler").replace(/\s+/g, "_")}_ficha.pdf`;
      await exportToPdf(["pdf-page-1", "pdf-page-2", "pdf-page-3", "pdf-page-4"], filename);
    } catch (e) {
      alert("Erro ao exportar PDF: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
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
          <h1 className="text-sm font-black uppercase tracking-[0.2em] hidden sm:block">
            {character.name || "Nova Ficha"}
          </h1>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 border-2 border-black px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 bg-red-800 text-white border-2 border-red-800 px-3 py-1.5 text-xs font-black uppercase hover:bg-black hover:border-black disabled:opacity-50"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Exportar PDF
            </button>
          </div>
        </div>

        {/* Section tab navigation */}
        <div className="flex flex-wrap gap-1 mb-4 border-b-2 border-black pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.15em] rounded transition-colors ${
                tab === t.id ? "bg-[#1f1f1f] text-white" : "text-[#4a5568] hover:bg-black/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {tab === "sheet" && (
            <>
              <HeaderSection character={character} onChange={handleChange} />
              <CoreStatsSection character={character} onChange={handleChange} showQuickFill={false} />
              <CombatSection character={character} onChange={handleChange} />
            </>
          )}
          {tab === "attacks" && <AttacksSection character={character} onChange={handleChange} />}
          {tab === "skills" && <SkillsSection character={character} onChange={handleChange} />}
          {tab === "spells" && <TabPlaceholder label="Spells" />}
          {tab === "companions" && <TabPlaceholder label="Companions" />}
          {tab === "gear" && <GearSection character={character} onChange={handleChange} />}
          {tab === "inventory" && <InventorySection character={character} onChange={handleChange} />}
          {tab === "journal" && <JournalSection character={character} onChange={handleChange} />}
        </div>
      </div>

      {/* Hidden print sheet for PDF export */}
      <PrintSheet character={character} />
      <DiceRoller />
    </div>
  );
}