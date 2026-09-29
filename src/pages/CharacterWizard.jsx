import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createEmptyCharacter, emptyStats, setNested, STAT_KEYS, STAT_LABELS, STAT_ABBR, calcMod } from "@/lib/characterDefaults";
import { RACE_OPTIONS, getSteps } from "@/lib/backgrounds";
import { findWeapon, findSpell, findUnarmed, weaponNotes, spellNotes, unarmedNotes } from "@/lib/combatLibrary";
import { getSkillCheckType } from "@/lib/skillCheckTypes";
import CoreStatsSection from "@/components/character/CoreStatsSection";
import CombatStep from "@/components/wizard/CombatStep";
import BackstoryStep from "@/components/wizard/BackstoryStep";
import { ArrowLeft, ArrowRight, Check, Loader2, Skull, User, PawPrint, Lock } from "lucide-react";

export default function CharacterWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [experience, setExperience] = useState(null);
  const [race, setRace] = useState(null);
  const [size, setSize] = useState(null);
  const [choices, setChoices] = useState({});
  const [stats, setStats] = useState(emptyStats());
  const [currentMana, setCurrentMana] = useState(0);
  const [combat, setCombat] = useState({ type: null, category: "", name: "" });
  const [backstory, setBackstory] = useState({ past_trauma: "", loose_ends: "", regrets: "" });
  const [creating, setCreating] = useState(false);

  const steps = getSteps(race);
  const totalBgSteps = steps.length;
  const raceStep = 1;
  const statsStep = totalBgSteps + 2;
  const combatStep = totalBgSteps + 3;
  const storyStep = totalBgSteps + 4;
  const reviewStep = totalBgSteps + 5;

  const intScore = Number(stats.intelligence?.enhanced) || 0;

  const canProceed = () => {
    if (step === 0) {
      return experience === "new";
    }
    if (step === raceStep) {
      if (!race) return false;
      if (race === "animal") return !!size;
      return true;
    }
    if (step >= raceStep + 1 && step <= totalBgSteps + 1) {
      const c = choices[steps[step - 2].id];
      return c && c.optionId && (c.skillNames || []).length === 2;
    }
    if (step === statsStep) {
      return STAT_KEYS.every((k) => Number(stats[k]?.unenhanced) > 0);
    }
    if (step === combatStep) {
      const t = combat?.type;
      if (t === "weapon") return !!combat.category && !!combat.name;
      if (t === "spell") return intScore >= 4 && !!combat.name;
      if (t === "unarmed") return !!combat.name;
      return false;
    }
    return true;
  };

  const next = () => setStep((s) => Math.min(s + 1, reviewStep));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const handleExperience = (id) => {
    if (id === "veteran") return; // work in progress — not clickable
    setExperience(id);
  };

  const handleRace = (id) => {
    setRace(id);
    setChoices({});
    if (id !== "animal") setSize(null);
  };

  const selectBackground = (stepId, optionId) => {
    setChoices((prev) => ({ ...prev, [stepId]: { optionId, skillNames: [] } }));
  };

  const toggleSkill = (stepId, skillName) => {
    setChoices((prev) => {
      const cur = prev[stepId] || { optionId: null, skillNames: [] };
      const names = cur.skillNames || [];
      if (names.includes(skillName)) {
        return { ...prev, [stepId]: { ...cur, skillNames: names.filter((n) => n !== skillName) } };
      }
      if (names.length >= 2) return prev;
      return { ...prev, [stepId]: { ...cur, skillNames: [...names, skillName] } };
    });
  };

  const handleStatsChange = (path, value) => {
    if (path === "stats") setStats(value);
    else if (path === "current_mana") setCurrentMana(value);
    else if (path.startsWith("stats.")) setStats((prev) => setNested(prev, path.slice(6), value));
  };

  const buildSkills = () => {
    const skills = [];
    steps.forEach((s) => {
      const c = choices[s.id];
      if (!c || !c.optionId) return;
      const opt = s.options.find((o) => o.id === c.optionId);
      if (!opt) return;
      (c.skillNames || []).forEach((skillName) => {
        const sk = opt.skills.find((x) => x.name === skillName);
        if (!sk) return;
        const ct = getSkillCheckType(sk.name);
        skills.push({
          name: sk.name,
          rank: String(s.rank),
          stat_mod: sk.stat_mod,
          check_type: ct?.check_type || "Skill",
          notes: ct?.notes || "",
        });
      });
    });
    if (race === "human") skills.push({ name: "Unarmed Attack", rank: "3", stat_mod: "STR", check_type: "Evade", notes: "Bludgeoning damage" });
    else if (race === "animal") skills.push({ name: "Slice", rank: "3", stat_mod: "STR", check_type: "Evade", notes: "Bludgeoning damage" });
    if (combat?.type === "weapon") {
      const w = findWeapon(combat.category, combat.name);
      skills.push({ name: combat.name, rank: "3", stat_mod: w?.stat || "STR", check_type: "Evade", notes: w ? weaponNotes(w) : "" });
    } else if (combat?.type === "spell") {
      const sp = findSpell(combat.name);
      skills.push({ name: combat.name, rank: "3", stat_mod: sp?.stat || "INT", check_type: "Evade", notes: sp ? spellNotes(sp) : "" });
    } else if (combat?.type === "unarmed") {
      const u = findUnarmed(combat.name);
      skills.push({ name: combat.name, rank: "3", stat_mod: u?.stat || "STR", check_type: "Evade", notes: u ? unarmedNotes(u) : "" });
    }
    skills.push({ name: "Heal", rank: "1", stat_mod: "INT", check_type: "Spell", notes: "Mana Cost 2 · Self · Heal 2 Health Bar slots" });
    while (skills.length < 18) skills.push({ name: "", rank: "", stat_mod: "", check_type: "", notes: "" });
    return skills;
  };

  const buildHotlist = () => {
    const hot = Array.from({ length: 10 }, () => "");
    hot[0] = "Heal";
    if (combat?.type === "weapon") hot[1] = combat.name?.trim() || combat.category || "Weapon";
    else if (combat?.type === "spell") hot[1] = combat.name?.trim() || "Spell";
    return hot;
  };

  const buildAttacks = () => {
    const atks = Array.from({ length: 6 }, () => ({ name: "", rank: "", stat: "", dice_mod: "", effects: "" }));
    if (combat?.type === "weapon") {
      const w = findWeapon(combat.category, combat.name);
      if (w) {
        atks[0] = {
          name: combat.name,
          rank: "3",
          stat: w.stat || "STR",
          dice_mod: w.damage,
          effects: `${w.type}${w.range ? ` · Alcance ${w.range}` : ""}${w.notes !== "—" ? ` · ${w.notes}` : ""} · AI Favor +${w.ai_favor}`,
        };
      }
    } else if (combat?.type === "spell") {
      const s = findSpell(combat.name);
      if (s) {
        atks[0] = {
          name: combat.name,
          rank: "3",
          stat: s.stat || "INT",
          dice_mod: s.damage,
          effects: `${s.type} · Mana ${s.mana} · Alcance ${s.range} · AI Favor +${s.ai_favor}`,
        };
      }
    } else if (combat?.type === "unarmed") {
      const u = findUnarmed(combat.name);
      if (u) {
        atks[0] = {
          name: combat.name,
          rank: "3",
          stat: u.stat || "STR",
          dice_mod: u.damage,
          effects: `${u.type} · Damage Effect: ${u.damageEffect} · ${u.effectNotes} · AI Favor +${u.ai_favor}`,
        };
      }
    }
    return atks;
  };

  const buildInventory = () => {
    const inv = Array.from({ length: 24 }, () => ({ name: "", quantity: "", notes: "" }));
    let i = 0;
    if (combat?.type === "weapon") {
      const w = findWeapon(combat.category, combat.name);
      inv[i++] = { name: combat.name, quantity: "1", notes: w ? `${w.type}${w.notes !== "—" ? ` · ${w.notes}` : ""}` : "" };
    } else if (combat?.type === "spell") {
      inv[i++] = { name: "Mana Potion", quantity: "5", notes: "" };
    }
    return inv;
  };

  const buildNotes = () => {
    const labels = steps
      .map((s) => {
        const c = choices[s.id];
        const opt = s.options.find((o) => o.id === c?.optionId);
        return opt?.label;
      })
      .filter(Boolean);
    return labels.length ? `Background: ${labels.join(", ")}` : "";
  };

  const handleCreate = async () => {
    setCreating(true);
    try {
      const profile = race === "human" ? { ai_favor: "1", size: "4 (Medium)" } : { ai_favor: "", size };
      const data = {
        ...createEmptyCharacter(),
        race: race === "human" ? "Human" : "Animal",
        ...profile,
        level: 1,
        floor: "1",
        character_class: "Not yet assigned",
        stats,
        current_mana: currentMana,
        skills: buildSkills(),
        hotlist: buildHotlist(),
        attacks: buildAttacks(),
        inventory: buildInventory(),
        notes: buildNotes(),
        past_trauma: backstory.past_trauma || "",
        loose_ends: backstory.loose_ends || "",
        regrets: backstory.regrets || "",
      };
      const created = await base44.entities.Character.create(data);
      navigate(`/editor/${created.id}`, { replace: true });
    } catch (e) {
      alert("Erro ao criar personagem: " + (e?.message || e));
      setCreating(false);
    }
  };

  const renderExperience = () => (
    <div>
      <h2 className="text-xl font-black uppercase tracking-tight mb-1">Choose your Experience</h2>
      <p className="text-xs font-mono text-black/60 mb-4">Are you a fresh crawler just entering the dungeon, or a seasoned veteran?</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => handleExperience("new")}
          className={`text-left border-2 p-4 transition-colors ${experience === "new" ? "border-red-800 bg-red-800/10" : "border-black hover:bg-black/5"}`}
        >
          <div className="flex items-center gap-2 mb-1">
            <User className="w-5 h-5" />
            <span className="text-lg font-black uppercase">New at Level 1</span>
          </div>
          <p className="text-xs font-mono text-black/60">A fresh crawler — start from scratch with the standard creation flow.</p>
        </button>
        <button
          disabled
          className="text-left border-2 border-black/30 p-4 bg-black/5 cursor-not-allowed relative"
        >
          <div className="flex items-center gap-2 mb-1 text-black/40">
            <Lock className="w-5 h-5" />
            <span className="text-lg font-black uppercase">Veteran</span>
          </div>
          <p className="text-xs font-mono text-black/40">Work in progress — coming soon.</p>
          <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-black/70 text-white px-1.5 py-0.5">Soon</span>
        </button>
      </div>
    </div>
  );

  const renderRace = () => (
    <div>
      <h2 className="text-xl font-black uppercase tracking-tight mb-1">Choose your Crawler Type</h2>
      <p className="text-xs font-mono text-black/60 mb-4">Human or Animal — this sets your backgrounds and starting attack skill.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {RACE_OPTIONS.map((r) => (
          <button
            key={r.id}
            onClick={() => handleRace(r.id)}
            className={`text-left border-2 p-4 transition-colors ${race === r.id ? "border-red-800 bg-red-800/10" : "border-black hover:bg-black/5"}`}
          >
            <div className="flex items-center gap-2 mb-1">
              {r.id === "human" ? <User className="w-5 h-5" /> : <PawPrint className="w-5 h-5" />}
              <span className="text-lg font-black uppercase">{r.label}</span>
            </div>
            <p className="text-xs font-mono text-black/60">{r.description}</p>
          </button>
        ))}
      </div>

      {race === "human" && (
        <div className="mt-4 text-xs font-mono text-black/60 border-2 border-black/30 p-2">
          AI Favor set to <span className="font-bold">1</span> · Size set to <span className="font-bold">4 (Medium)</span>
        </div>
      )}

      {race === "animal" && (
        <div className="mt-4 border-2 border-black p-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-2">Choose Size</div>
          <div className="flex flex-wrap gap-2">
            {["2 (Small)", "3 (Petite)", "4 (Medium)"].map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${size === s ? "border-red-800 bg-red-800 text-white" : "border-black hover:bg-black/5"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="text-[10px] font-mono text-black/50 mt-2">Animals have no AI Favor.</div>
        </div>
      )}
    </div>
  );

  const renderBackground = (bgStep, stepNum) => {
    const cur = choices[bgStep.id] || { optionId: null, skillNames: [] };
    const selectedOpt = bgStep.options.find((o) => o.id === cur.optionId);
    const usedElsewhere = new Set();
    Object.entries(choices).forEach(([sid, c]) => {
      if (sid !== bgStep.id) (c.skillNames || []).forEach((n) => usedElsewhere.add(n));
    });

    return (
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-1">Step {stepNum}: {bgStep.title}</h2>
        <p className="text-xs font-mono text-black/60 mb-4">
          Pick a background, then choose <span className="font-bold">2 of its 3 skills</span> (Rank {bgStep.rank}). Skills chosen in other steps are locked.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {bgStep.options.map((opt) => {
            const selected = cur.optionId === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => selectBackground(bgStep.id, opt.id)}
                className={`text-left border-2 p-2.5 transition-colors ${selected ? "border-red-800 bg-red-800/10" : "border-black hover:bg-black/5"}`}
              >
                <div className="text-sm font-black uppercase leading-tight mb-1">{opt.label}</div>
                <ul className="text-[10px] font-mono text-black/60 space-y-0.5">
                  {opt.skills.map((sk) => (
                    <li key={sk.name} className={usedElsewhere.has(sk.name) ? "line-through opacity-50" : ""}>
                      {sk.name} ({sk.stat_mod})
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        {selectedOpt && (
          <div className="mt-4 border-2 border-black p-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-2">
              Pick 2 skills from {selectedOpt.label} · Rank {bgStep.rank}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedOpt.skills.map((sk) => {
                const isChosen = cur.skillNames.includes(sk.name);
                const isLocked = usedElsewhere.has(sk.name);
                return (
                  <button
                    key={sk.name}
                    disabled={isLocked}
                    onClick={() => toggleSkill(bgStep.id, sk.name)}
                    className={`flex items-center gap-1.5 border-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                      isLocked
                        ? "border-black/20 bg-black/5 text-black/30 cursor-not-allowed"
                        : isChosen
                        ? "border-red-800 bg-red-800 text-white"
                        : "border-black hover:bg-black/5"
                    }`}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : isChosen ? <Check className="w-3 h-3" /> : null}
                    {sk.name} ({sk.stat_mod})
                  </button>
                );
              })}
            </div>
            <div className="text-[10px] font-mono text-black/50 mt-2">
              Selected: {cur.skillNames.length}/2
              {selectedOpt.skills.filter((s) => !usedElsewhere.has(s.name)).length < 2 && (
                <span className="grunge-red ml-2 font-bold">· Only {selectedOpt.skills.filter((s) => !usedElsewhere.has(s.name)).length} available — pick another background.</span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderReview = () => {
    const allSkills = buildSkills().filter((s) => s.name);
    return (
      <div>
        <h2 className="text-xl font-black uppercase tracking-tight mb-1">Review & Create</h2>
        <p className="text-xs font-mono text-black/60 mb-4">Confirm your choices — the character will be created with these starting skills.</p>

        <div className="border-2 border-black p-3 mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Race</div>
          <div className="text-sm font-black uppercase mb-1">{race === "human" ? "Human" : "Animal"}</div>
          <div className="text-[11px] font-mono text-black/70">
            AI Favor: <span className="font-bold">{race === "human" ? "1" : "—"}</span> · Size: <span className="font-bold">{race === "human" ? "4 (Medium)" : size}</span>
          </div>
        </div>

        {steps.map((s) => {
          const c = choices[s.id];
          const opt = s.options.find((o) => o.id === c?.optionId);
          return (
            <div key={s.id} className="border-2 border-black p-3 mb-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">{s.title}</div>
              <div className="text-sm font-black uppercase mb-1">{opt ? opt.label : "—"}</div>
              <div className="text-[11px] font-mono text-black/70">
                {(c?.skillNames || []).map((name) => {
                  const sk = opt?.skills.find((x) => x.name === name);
                  return `${name} (${sk?.stat_mod || ""}) R${s.rank}`;
                }).join(" · ")}
              </div>
            </div>
          );
        })}

        <div className="border-2 border-black p-3 mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Core Stats</div>
          <div className="grid grid-cols-5 gap-1">
            {STAT_KEYS.map((k) => (
              <div key={k} className="text-center">
                <div className="text-[9px] font-mono text-black/50">{STAT_ABBR[k]}</div>
                <div className="text-sm font-black">{stats[k]?.unenhanced ?? 0}</div>
                <div className="text-[10px] font-mono grunge-red">+{calcMod(stats[k]?.enhanced)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-2 border-black p-3 mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Combat</div>
          <div className="text-sm font-black uppercase">
            {combat?.type === "weapon" ? `Weapon: ${combat.category} — ${combat.name}` : combat?.type === "spell" ? `Spell: ${combat.name}` : combat?.type === "unarmed" ? `Unarmed: ${combat.name}` : "—"}
          </div>
        </div>

        <div className="border-2 border-black p-3 mb-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Backstory</div>
          <div className="text-[11px] font-mono text-black/70 space-y-0.5">
            <div><span className="font-bold">Trauma:</span> {backstory.past_trauma || "—"}</div>
            <div><span className="font-bold">Loose Ends:</span> {backstory.loose_ends || "—"}</div>
            <div><span className="font-bold">Regrets:</span> {backstory.regrets || "—"}</div>
          </div>
        </div>

        <div className="border-2 border-black p-3 mt-3 bg-black/5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-black/60 mb-1">Granted Skills</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
            {allSkills.map((sk, i) => (
              <div key={i} className="text-[11px] font-mono flex justify-between border-b border-black/15 py-0.5">
                <span>{sk.name} ({sk.stat_mod})</span>
                <span className="grunge-red font-bold">Rank {sk.rank}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const stepLabels = ["Start", "Race", ...steps.map((s) => s.short), "Stats", "Combat", "Story", "Review"];

  return (
    <div className="min-h-screen grunge-paper">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 border-b-4 border-black pb-3 mb-4">
          <Skull className="w-8 h-8 text-red-800" />
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight leading-none">New Crawler</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">Character Creation</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-5 overflow-x-auto pb-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1 shrink-0">
              <div className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-black uppercase tracking-wider border-2 ${i === step ? "border-red-800 bg-red-800 text-white" : i < step ? "border-black bg-black/80 text-white" : "border-black/30 text-black/40"}`}>
                {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < stepLabels.length - 1 && <div className="w-3 h-px bg-black/30" />}
            </div>
          ))}
        </div>

        <div className="mb-5">
          {step === 0 && renderExperience()}
          {step === raceStep && renderRace()}
          {step >= raceStep + 1 && step <= totalBgSteps + 1 && renderBackground(steps[step - 2], step - 1)}
          {step === statsStep && <CoreStatsSection character={{ stats, current_mana: currentMana }} onChange={handleStatsChange} />}
          {step === combatStep && <CombatStep combat={combat} onChange={setCombat} intScore={intScore} />}
          {step === storyStep && <BackstoryStep backstory={backstory} onChange={setBackstory} />}
          {step === reviewStep && renderReview()}
        </div>

        <div className="flex items-center justify-between border-t-2 border-black pt-3">
          <button
            onClick={back}
            disabled={step === 0}
            className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider disabled:opacity-30 hover:text-red-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          {step < reviewStep ? (
            <button
              onClick={next}
              disabled={!canProceed()}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-red-800 disabled:opacity-30"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 bg-red-800 text-white px-4 py-2 text-sm font-black uppercase tracking-wider hover:bg-black disabled:opacity-50"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Create Character
            </button>
          )}
        </div>
      </div>
    </div>
  );
}