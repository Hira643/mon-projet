import { pokemonName } from "./pokemon-names.js";
import { MAX_POKEMON_LEVEL, pokemonXpProgress } from "./pokemon-levels.js";
import { getCharacter, characterEffects } from "./characters.js";
import { TYPE_CHART } from "./type-chart.js";
export const TEAM_SIZE = 5;
export const MAX_BATTLE_LEVEL = MAX_POKEMON_LEVEL;
export const HP_MULTIPLIER = 3;
export const SPECIAL_CHARGE = 3;
export const TYPE_LABELS = { normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik", grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison", ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte", rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres", steel: "Acier", fairy: "Fée" };

// Four game techniques per Pokémon. Energy belongs to each individual card.
export function movesFor(card) {
  const primary = card.types?.[0] ?? "normal", secondary = card.types?.[1] ?? primary;
  return [
    { id:"physical", name:"Coup rapide", category:"physical", types:["normal"], power:1, cost:0 },
    { id:"typed", name:`Frappe ${TYPE_LABELS[primary] ?? primary}`, category:"physical", types:[primary], power:.85, cost:0 },
    { id:"technique", name:`Vague ${TYPE_LABELS[secondary] ?? secondary}`, category:"special", types:[secondary], power:1.15, cost:2 },
    { id:"special", name:"Déferlante ultime", category:"special", types:card.types?.length ? [...card.types] : ["normal"], power:1.6, cost:3 }
  ];
}
export function availableMoves(card) { return movesFor(card).filter(move => card.charge >= move.cost); }

export function drawPokemonIds(random = Math.random) {
  const pool = Array.from({ length: 151 }, (_, index) => index + 1);
  for (let index = 0; index < 10; index++) {
    const selected = index + Math.floor(random() * (pool.length - index));
    [pool[index], pool[selected]] = [pool[selected], pool[index]];
  }
  return pool.slice(0, 10);
}

export function createCard(pokemon, level = 1, characterId = null, xp = undefined) {
  const baseStats = Object.fromEntries(pokemon.stats.map(({ stat, base_stat }) => [stat.name, base_stat]));
  if (!Number.isInteger(level) || level < 1 || level > MAX_BATTLE_LEVEL) throw new Error("Niveau de carte invalide.");
  const stats = Object.fromEntries(Object.entries(baseStats).map(([key, value]) => [key, Math.round(value * (1 + (level - 1) * 0.1))]));
  const required = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
  if (!Number.isInteger(pokemon.id) || pokemon.id < 1 || pokemon.id > 151 || required.some((key) => !Number.isFinite(stats[key]) || stats[key] <= 0)) throw new Error("Fiche Pokémon invalide pour ce combat.");
  const effects=characterEffects(characterId), maxHp=Math.round(stats.hp*HP_MULTIPLIER*effects.hp);
  return { baseStats, ...(xp === undefined ? {} : {xp:pokemonXpProgress(xp).total}), characterId:getCharacter(characterId)?.id ?? null, id: pokemon.id, level, name: pokemonName(pokemon), image: pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? "", types: pokemon.types.map(({ type }) => type.name), stats, maxHp, hp:maxHp, charge:effects.startingCharge, guard: false };
}

export function createBattle(pokemon, { allowSharedSpecies = false, levels = [], experience = [], playerCharacterId = null } = {}) {
  if (pokemon.length !== 10 || (!allowSharedSpecies && new Set(pokemon.map(({ id }) => id)).size !== 10) || [pokemon.slice(0,5), pokemon.slice(5)].some((team) => new Set(team.map(({ id }) => id)).size !== 5)) throw new Error("Il faut cinq Pokémon différents par équipe.");
  return { phase: "playing", teams: [pokemon.slice(0,5).map((card,index) => createCard(card,levels[index] ?? 1,playerCharacterId,experience[index])), pokemon.slice(5).map((card,index) => createCard(card,levels[index+5] ?? 1))], active: [0,0], turn: 0, turnNumber: 1, winner: null, lastEvent: null, log: ["Le combat commence. Quatre attaques par Pokémon : deux libres, une technique à 2 charges et une ultime à 3 charges."] };
}

export function typeMultiplier(type, defenderTypes = []) {
  return defenderTypes.reduce((result, target) => result * (TYPE_CHART[type]?.[target] ?? 1), 1);
}

export function damageDetails(attacker, defender, kind) {
  const move = movesFor(attacker).find(item => item.id === kind);
  if (!move) throw new Error("Attaque inconnue.");
  const attackKey = move.category === "special" ? "special-attack" : "attack";
  const defenseKey = move.category === "special" ? "special-defense" : "defense";
  const type = move.types.slice().sort((a,b) => typeMultiplier(b,defender.types)-typeMultiplier(a,defender.types))[0];
  const multiplier = typeMultiplier(type,defender.types), stab = attacker.types?.includes(type) ? 1.25 : 1;
  const base = Math.max(1,attacker.stats[attackKey]-Math.floor(defender.stats[defenseKey]/2));
  const outgoing=characterEffects(attacker.characterId), incoming=characterEffects(defender.characterId);
  const characterPower=move.category === "special" ? outgoing.specialDamage : outgoing.physicalDamage;
  const damage = multiplier === 0 ? 0 : Math.max(1,Math.round(base*multiplier*stab*move.power*characterPower*incoming.damageTaken*(defender.guard ? .5 : 1)));
  return { damage,type,multiplier,stab,guarded:Boolean(defender.guard),power:move.power,moveName:move.name };
}
export function damageFor(attacker, defender, kind) { return damageDetails(attacker,defender,kind).damage; }
export function canSpecial(card) { return card.charge >= SPECIAL_CHARGE; }
export function defensiveMatchups(card) {
  return Object.keys(TYPE_CHART).map((type) => ({ type, multiplier: typeMultiplier(type, card.types) })).filter(({ multiplier }) => multiplier !== 1);
}

export function selectPokemon(state, player, index) {
  if (state.phase !== "playing" || state.turn !== player || !Number.isInteger(index) || !state.teams[player]?.[index] || state.teams[player][index].hp <= 0) return state;
  const active = [...state.active]; active[player] = index;
  return { ...state, active };
}
export function beginTurn(state, player) { return state.phase === "handoff" && state.turn === player ? { ...state, phase: "playing" } : state; }

function finishAction(state, teams, message, lastEvent, winner = null, active = state.active) {
  return { ...state, teams, active, phase: winner === null ? "handoff" : "over", winner, turn: winner ?? (1 - state.turn), turnNumber: winner === null ? state.turnNumber + 1 : state.turnNumber, lastEvent, log: [...state.log,message].slice(-10) };
}

export function defend(state, player) {
  if (state.phase !== "playing" || state.turn !== player) return state;
  const active = state.active[player], card = state.teams[player][active];
  if (card.hp <= 0) return state;
  const teams = state.teams.map((team, owner) => team.map((item,index) => owner === player && index === active ? { ...item, guard: true, charge: Math.min(SPECIAL_CHARGE,item.charge + 1) } : item));
  return finishAction(state,teams,`Joueur ${player+1} : ${card.name} se protège. La prochaine attaque reçue sera réduite de moitié. Charge +1.`,{ kind: "guard", player, pokemon: card.name });
}

export function attack(state, player, kind) {
  if (state.phase !== "playing" || state.turn !== player) return state;
  const opponent = 1-player, attacker = state.teams[player][state.active[player]], defender = state.teams[opponent][state.active[opponent]];
  const move = movesFor(attacker).find(item => item.id === kind);
  if (!move || attacker.hp <= 0 || defender.hp <= 0 || attacker.charge < move.cost) return state;
  const details = damageDetails(attacker,defender,kind), damage = Math.min(defender.hp,details.damage);
  const teams = state.teams.map((team, owner) => team.map((card,index) => {
    if (owner === opponent && index === state.active[opponent]) return { ...card, hp: Math.max(0,card.hp - damage), guard: false };
    if (owner === player && index === state.active[player]) return { ...card, charge: move.cost > 0 ? card.charge-move.cost : Math.min(SPECIAL_CHARGE,card.charge+1) };
    return card;
  }));
  const active = [...state.active];
  const nextAlive = teams[opponent].findIndex((card) => card.hp > 0);
  const won = nextAlive === -1;
  let message = `Joueur ${player+1} : ${attacker.name} utilise ${move.name} (${TYPE_LABELS[details.type]}). ${defender.name} perd ${damage} PV.`;
  if (details.multiplier === 0) message += " Aucun effet : immunité !";
  else if (details.multiplier > 1) message += ` Super efficace ! ×${details.multiplier}.`;
  else if (details.multiplier < 1) message += ` Résistance : ×${details.multiplier}.`;
  if (details.guarded) message += " Protection : dégâts divisés par 2.";
  if (teams[opponent][active[opponent]].hp === 0) {
    message += ` ${defender.name} est K.O. !`;
    if (!won) { active[opponent] = nextAlive; message += ` ${teams[opponent][nextAlive].name} entre en jeu.`; }
  }
  if (won) message += ` Joueur ${player+1} remporte le combat !`;
  return finishAction(state,teams,message,{ kind, player, target: opponent, damage, ...details, damageApplied: damage, pokemon: attacker.name, knockedOut: teams[opponent][state.active[opponent]].hp === 0 },won ? player : null,active);
}

// Apply saved experience after an attack without restoring damage already taken.
export function withPokemonExperience(state, player, id, owned) {
  const teams = state.teams.map((team,owner)=>owner !== player ? team : team.map(card=>{
    if (card.id !== id) return card;
    const stats = Object.fromEntries(Object.entries(card.baseStats).map(([key,value])=>[key,Math.round(value*(1+(owned.level-1)*0.1))]));
    const maxHp = Math.round(stats.hp*HP_MULTIPLIER*characterEffects(card.characterId).hp);
    return {...card,stats,level:owned.level,xp:owned.xp,maxHp,hp:card.hp === 0 ? 0 : Math.min(maxHp,Math.max(1,card.hp+maxHp-card.maxHp))};
  }));
  return {...state,teams};
}

export function useBattleItem(state,player,item) {
  if(state.phase!=="playing"||state.turn!==player||!item||(!item.heal&&!item.charge)|| (item.heal!==undefined&&(!Number.isFinite(item.heal)||item.heal<=0||item.heal>1)) || (item.charge!==undefined&&(!Number.isInteger(item.charge)||item.charge<=0||item.charge>SPECIAL_CHARGE)))return state;
  const index=state.active[player],card=state.teams[player][index];
  if(card.hp<=0||(item.heal&&card.hp>=card.maxHp)||(item.charge&&card.charge>=SPECIAL_CHARGE))return state;
  const healed=item.heal?Math.min(card.maxHp-card.hp,Math.ceil(card.maxHp*item.heal)):0;
  const teams=state.teams.map((team,owner)=>owner!==player?team:team.map((c,i)=>i!==index?c:{...c,hp:c.hp+healed,charge:Math.min(SPECIAL_CHARGE,c.charge+(item.charge??0))}));
  return finishAction(state,teams,`Joueur ${player+1} : ${item.name} utilisé sur ${card.name}. ${healed?`+${healed} PV.`:"Charge +1."}`,{kind:"item",player,pokemon:card.name,healed});
}
