export const MAX_POKEMON_LEVEL = 100;
export const POKEMON_XP_STEP = 50;
export function pokemonXpForLevel(level) {
  if (!Number.isInteger(level) || level < 1 || level > MAX_POKEMON_LEVEL) throw new Error("Niveau Pokémon invalide.");
  return POKEMON_XP_STEP * (level - 1) * level / 2;
}
export const MAX_POKEMON_XP = pokemonXpForLevel(MAX_POKEMON_LEVEL);
export function pokemonXpProgress(xp = 0) {
  if (!Number.isSafeInteger(xp) || xp < 0) throw new Error("XP Pokémon invalide.");
  const total = Math.min(xp, MAX_POKEMON_XP);
  const level = Math.min(MAX_POKEMON_LEVEL, Math.floor((1 + Math.sqrt(1 + 8 * total / POKEMON_XP_STEP)) / 2));
  const maxed = level === MAX_POKEMON_LEVEL;
  const current = total - pokemonXpForLevel(level);
  const required = maxed ? 0 : POKEMON_XP_STEP * level;
  return {level,total,current,required,maxed,percent:maxed ? 100 : 100 * current / required};
}
export function attackExperience(opponentLevel, knockedOut = false, baseStats = undefined) {
  if (!Number.isInteger(opponentLevel) || opponentLevel < 1 || opponentLevel > MAX_POKEMON_LEVEL) throw new Error("Niveau adverse invalide.");
  if (!knockedOut) return 0;
  const keys = ["hp","attack","defense","special-attack","special-defense","speed"];
  if (baseStats !== undefined && keys.some(key=>!Number.isFinite(baseStats?.[key]) || baseStats[key] <= 0)) throw new Error("Statistiques adverses invalides.");
  const strength = baseStats === undefined ? 330 : keys.reduce((sum,key)=>sum+baseStats[key],0);
  return Math.max(1,Math.round((25 + 5 * (opponentLevel - 1)) * strength / 330));
}
export function knockoutExperience(opponent) {
  return attackExperience(opponent.level,true,opponent.baseStats);
}

const escape = value => String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
export function pokemonXpMarkup(xp, name, compact = false) {
  const progress = pokemonXpProgress(xp);
  return `<div class="pokemon-xp${compact ? " pokemon-xp-compact" : ""}"><div><span>${progress.maxed ? "NIVEAU 100 · MAX" : `XP · Niv. ${progress.level} → ${progress.level + 1}`}</span><strong>${progress.maxed ? "MAX" : `${progress.current} / ${progress.required}`}</strong></div><progress value="${progress.maxed ? 1 : progress.current}" max="${progress.maxed ? 1 : progress.required}" aria-label="XP de ${escape(name)}">${progress.percent}%</progress></div>`;
}
