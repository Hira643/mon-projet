import {createLeague,normalizeLeague,trackLeagueEvent} from "./league-model.js";
import { MAX_POKEMON_LEVEL, pokemonXpForLevel, pokemonXpProgress, knockoutExperience } from "./pokemon-levels.js";
import { getCharacter, characterReward } from "./characters.js";
export const STARTER_DECK = [1, 4, 7, 16, 19];
export const MAX_LEVEL = MAX_POKEMON_LEVEL;
export const SAVE_KEY = "pokemon-kanto-profile-v1";
export const MEW_GIFT_ID = "mew-10-2026-11-03";
const ORIGINAL_TRAINERS = [
  { id: "leo", name: "Léo", title: "Le débutant", difficulty: "easy", level: 1, team: [10, 13, 11, 14, 129] },
  { id: "mia", name: "Mia", title: "La promeneuse", difficulty: "easy", level: 1, team: [16, 19, 21, 43, 10] },
  { id: "hugo", name: "Hugo", title: "Le campeur", difficulty: "easy", level: 1, team: [41, 46, 60, 69, 74] },
  { id: "lina", name: "Lina", title: "La botaniste", difficulty: "easy", level: 1, team: [43, 46, 69, 102, 114] },
  { id: "noe", name: "Noé", title: "Le premier rival", difficulty: "easy", level: 2, team: [1, 4, 7, 16, 19] },
  { id: "iris", name: "Iris", title: "La tacticienne", difficulty: "medium", level: 2, team: [2, 5, 8, 17, 20] },
  { id: "axel", name: "Axel", title: "Le spécialiste roche", difficulty: "medium", level: 2, team: [75, 95, 111, 138, 140] },
  { id: "jade", name: "Jade", title: "La nageuse", difficulty: "medium", level: 3, team: [61, 79, 86, 90, 120] },
  { id: "sacha", name: "Sacha", title: "Le collectionneur", difficulty: "medium", level: 3, team: [25, 26, 64, 67, 93] },
  { id: "nora", name: "Nora", title: "La stratège", difficulty: "medium", level: 3, team: [36, 40, 97, 122, 124] },
  { id: "victor", name: "Victor", title: "Le vétéran", difficulty: "hard", level: 4, team: [3, 6, 9, 18, 65] },
  { id: "ambre", name: "Ambre", title: "La spécialiste feu", difficulty: "hard", level: 4, team: [6, 38, 59, 78, 126] },
  { id: "orion", name: "Orion", title: "Le maître des spectres", difficulty: "hard", level: 5, team: [94, 103, 121, 130, 143] },
  { id: "selene", name: "Sélène", title: "La gardienne légendaire", difficulty: "hard", level: 5, team: [131, 142, 144, 145, 146] },
  { id: "darius", name: "Darius", title: "Le dernier champion", difficulty: "hard", level: 6, team: [65, 94, 130, 149, 150] }
];
// Independent, replayable encounters: they never advance or unlock the adventure.
const FREE_TRAINER_SEEDS = [
  ...ORIGINAL_TRAINERS,
  { id:"olivia",name:"Olivia",title:"La cueilleuse",difficulty:"easy",level:1,team:[23,27,29,32,52] },
  { id:"timeo",name:"Timéo",title:"Le jeune explorateur",difficulty:"easy",level:2,team:[48,54,56,63,66] },
  { id:"manon",name:"Manon",title:"La rivale",difficulty:"medium",level:3,team:[22,24,28,30,33] },
  { id:"eden",name:"Eden",title:"Le technicien",difficulty:"medium",level:3,team:[53,55,57,70,82] },
  { id:"elise",name:"Élise",title:"La championne de l’arène",difficulty:"hard",level:5,team:[68,91,112,134,135] }
];
export const FREE_TRAINER_LEVELS = 15;
export function freeTrainerReward(level) {
  if (!Number.isInteger(level) || level < 1 || level > FREE_TRAINER_LEVELS) throw new Error("Niveau de dresseur invalide.");
  return { coins:10*level,xp:25*level };
}
const FREE_NAMES = ["Éloïse","Lucas","Inès","Raphaël","Zoé","Arthur","Camille","Maël","Chloé","Adam","Lou","Gabriel","Rose","Louis","Alice","Nathan","Anna","Eden","Léonie","Oscar"];
export const FREE_TRAINERS = Array.from({ length:FREE_TRAINER_LEVELS*4 },(_,index) => {
  const level = 1+Math.floor(index/4), slot = index%4, seed = FREE_TRAINER_SEEDS[index];
  const template = ORIGINAL_TRAINERS[Math.min(11,Math.floor((level-1)/3)*3)+slot];
  const difficulty = level<=5 ? "easy" : level<=10 ? "medium" : "hard";
  return { ...template,id:seed ? `free-${seed.id}` : `free-level-${level}-${slot+1}`,name:seed?.name ?? `${FREE_NAMES[(index-20)%20]} ${["Valbois","Rivemer"][Math.floor((index-20)/20)]}`,title:level<=5 ? ["Le débutant","La promeneuse","Le campeur","La botaniste"][slot] : level<=10 ? ["Le tacticien","La spécialiste","Le rival","La stratège"][slot] : ["Le vétéran","La championne","Le maître","La gardienne"][slot],level,difficulty,team:[...template.team],mode:"free",portraitIndex:index%15 };
});
export const REGIONS = [
  { name:"Prairies de l’aube", subtitle:"Les premiers pas d’un grand dresseur", color:"#527d42" },
  { name:"Forêt Émeraude", subtitle:"Sous les arbres, la route continue", color:"#277455" },
  { name:"Rives d’Azur", subtitle:"Suis la rivière vers de nouveaux défis", color:"#277b91" },
  { name:"Côte des Écumes", subtitle:"Un vent d’aventure souffle sur la mer", color:"#248c99" },
  { name:"Collines d’Ambre", subtitle:"Chaque victoire te rapproche du sommet", color:"#a46e30" },
  { name:"Monts des Cascades", subtitle:"Prends de la hauteur, relève le défi", color:"#596b84" },
  { name:"Grottes de Cristal", subtitle:"La lumière guide les plus courageux", color:"#8460a2" },
  { name:"Vallée des Neiges", subtitle:"Garde ton sang-froid face aux vétérans", color:"#477e9c" },
  { name:"Terres de Braise", subtitle:"Les derniers obstacles forgent les champions", color:"#a64d36" },
  { name:"Route de la Couronne", subtitle:"Dix rencontres pour entrer dans la légende", color:"#997036" }
];
const NAMES = ["Éloïse","Lucas","Inès","Raphaël","Zoé","Arthur","Camille","Maël","Chloé","Adam","Lou","Gabriel","Rose","Louis","Alice","Nathan","Anna","Eden","Léonie","Oscar"];
export const TRAINERS = Array.from({ length:100 },(_,index) => {
  const template = ORIGINAL_TRAINERS[index % 15];
  const region = Math.floor(index / 10), boss = index % 10 === 9;
  const pool = ORIGINAL_TRAINERS[Math.min(14,Math.floor(index / 8))].team;
  return { ...template, id:index < 15 ? template.id : `route-${index+1}`, name:index < 15 ? template.name : `${NAMES[(index-15)%NAMES.length]} ${["Valbois","Rivemer","Rochefort","Aubépine","Couronne"][Math.floor((index-15)/20)]}${index === 99 ? " · Champion" : ""}`, title:boss ? "Gardien de la région" : ["Dresseur de la route","Exploratrice","Rival de passage","Spécialiste local"][index%4], stage:index+1, region, portraitIndex:index%15, difficulty:index<30 ? "easy" : index<70 ? "medium" : "hard", level:Math.min(10,1+Math.floor(index/12)+(boss ? 1 : 0)), team:[...(index < 10 ? template.team : pool)] };
});
export function canChallengeTrainer(profile,id) { return TRAINERS[profile.adventureWins]?.id === id; }
export const DIFFICULTIES = {
  easy: { label: "Facile", coins: 10, xp: 25 },
  medium: { label: "Moyen", coins: 30, xp: 60 },
  hard: { label: "Difficile", coins: 100, xp: 150 }
};
export const BOOSTER_TYPES = {
  small: { id: "small", name: "Booster Découverte", cards: 5, price: 50 },
  medium: { id: "medium", name: "Booster Super", cards: 10, price: 90 },
  large: { id: "large", name: "Booster Hyper", cards: 15, price: 130 }
};

export function createProfile() {
  return { version: 5, league:createLeague(), pokemonAttackClaims:[], characterId:null, adventureWins:0, lastReward:null, freeDefeatedTrainers:[], coins: 0, xp: 0, boosters: { small: 0, medium: 0, large: 0 }, collection: Object.fromEntries(STARTER_DECK.map((id) => [id, { copies: 1, level: 1, xp:0 }])), deck: [...STARTER_DECK], defeatedTrainers: [], claimedBattles: [] };
}
const validAmount = (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000000;
export function normalizeProfile(raw) {
  if (!raw || ![1,2,3,4,5].includes(raw.version) || !validAmount(raw.coins) || !raw.collection || typeof raw.collection !== "object") throw new Error("Sauvegarde invalide.");
  const boosters = typeof raw.boosters === "number" && raw.version === 1 ? { small: raw.boosters, medium: 0, large: 0 } : Object.fromEntries(Object.keys(BOOSTER_TYPES).map((key) => [key,raw.boosters?.[key] ?? 0]));
  if (!Object.values(boosters).every(validAmount) || (raw.xp !== undefined && !validAmount(raw.xp))) throw new Error("Inventaire ou XP invalide.");
  const collection = {};
  for (const [key,card] of Object.entries(raw.collection)) {
    const id = Number(key);
    if (Number.isInteger(id) && id >= 1 && id <= 151 && card && Number.isSafeInteger(card.copies) && card.copies >= 1 && card.copies <= 1000000 && Number.isInteger(card.level) && card.level >= 1 && card.level <= MAX_LEVEL) {
      // Version 4 used thresholds four times smaller. Preserve level and bar percentage.
      if (card.xp !== undefined && (!Number.isSafeInteger(card.xp) || card.xp < 0)) throw new Error("XP Pokémon invalide.");
      const xp = raw.version < 4 || card.xp === undefined ? pokemonXpForLevel(card.level) : pokemonXpProgress(card.xp * (raw.version === 4 ? 4 : 1)).total;
      collection[id] = {copies:card.copies,level:pokemonXpProgress(xp).level,xp};
    }
  }
  for (const id of STARTER_DECK) collection[id] ??= { copies:1,level:1,xp:0 };
  const deck = [...new Set(Array.isArray(raw.deck) ? raw.deck : [])].filter((id) => Number.isInteger(id) && collection[id]);
  const trainerIds = new Set(TRAINERS.map(({ id }) => id));
  const defeatedTrainers = [...new Set(Array.isArray(raw.defeatedTrainers) ? raw.defeatedTrainers : [])].filter((id) => trainerIds.has(id));
  let adventureWins = 0;
  if (raw.version < 3) { while (adventureWins < 100 && defeatedTrainers.includes(TRAINERS[adventureWins].id)) adventureWins++; }
  else {
    if (!Number.isInteger(raw.adventureWins) || raw.adventureWins < 0 || raw.adventureWins > 100) throw new Error("Progression d’aventure invalide.");
    adventureWins = raw.adventureWins;
  }
  const freeIds = new Set(FREE_TRAINERS.map(trainer => trainer.id));
  const freeDefeatedTrainers = [...new Set(Array.isArray(raw.freeDefeatedTrainers) ? raw.freeDefeatedTrainers : [])].filter(id => freeIds.has(id));
  const r = raw.lastReward;
  const lastReward = r && typeof r.battleId === "string" && (trainerIds.has(r.trainerId) || freeIds.has(r.trainerId)) && validAmount(r.coins) && validAmount(r.xp) && Array.isArray(r.cards) && r.cards.length <= 3 && r.cards.every(id => Number.isInteger(id) && id >= 1 && id <= 151) ? { battleId:r.battleId,trainerId:r.trainerId,coins:r.coins,xp:r.xp,cards:[...r.cards] } : null;
  return { ...(Array.isArray(raw.claimedGifts) && raw.claimedGifts.includes(MEW_GIFT_ID) ? {claimedGifts:[MEW_GIFT_ID]} : {}), version:5, league:normalizeLeague(raw.league,raw), pokemonAttackClaims:(Array.isArray(raw.pokemonAttackClaims) ? raw.pokemonAttackClaims : []).filter(id=>typeof id === "string").slice(-1000), characterId:getCharacter(raw.characterId)?.id ?? null, adventureWins, lastReward, freeDefeatedTrainers, coins:raw.coins, xp:raw.xp ?? 0, boosters, collection, deck:deck.length === 5 ? deck : [...STARTER_DECK], defeatedTrainers, claimedBattles:(Array.isArray(raw.claimedBattles) ? raw.claimedBattles : []).filter((id) => typeof id === "string").slice(-1000) };
}
export function loadProfile(storage) { const saved = storage.getItem(SAVE_KEY); return saved === null ? createProfile() : normalizeProfile(JSON.parse(saved)); }
export function saveProfile(storage,profile) { storage.setItem(SAVE_KEY,JSON.stringify(profile)); }
export function totalBoosters(profile) { return Object.values(profile.boosters).reduce((sum,value) => sum+value,0); }
export function xpProgress(xp) {
  const level = Math.floor((1+Math.sqrt(1+8*xp/100))/2);
  const start = 100*(level-1)*level/2, next = 100*level*(level+1)/2;
  return { level, current:xp-start, required:next-start, total:xp, percent:100*(xp-start)/(next-start) };
}
export function recordPokemonAttack(profile, battleId, before, after) {
  if (before === after || before?.phase !== "playing" || before.turn !== 0 || after?.lastEvent?.player !== 0 || after.lastEvent.knockedOut !== true || !["physical","typed","technique","special"].includes(after.lastEvent.kind)) return profile;
  if (typeof battleId !== "string" || !battleId || !Number.isSafeInteger(before.turnNumber) || before.turnNumber < 1) throw new Error("Attaque à sauvegarder invalide.");
  const claim = `${battleId}:${before.turnNumber}`;
  if (profile.pokemonAttackClaims?.includes(claim)) return profile;
  const attacker = before.teams[0][before.active[0]], opponent = before.teams[1][before.active[1]];
  if (opponent.hp <= 0 || after.teams[1][before.active[1]].hp !== 0) return profile;
  const owned = profile.collection[attacker.id];
  if (!owned || !profile.deck.includes(attacker.id)) throw new Error("Ce Pokémon ne fait pas partie de ton deck.");
  const currentXp = owned.xp ?? pokemonXpForLevel(owned.level);
  const progress = pokemonXpProgress(currentXp + knockoutExperience(opponent));
  return trackLeagueEvent({...profile,pokemonAttackClaims:[...(profile.pokemonAttackClaims ?? []),claim].slice(-1000),collection:{...profile.collection,[attacker.id]:{...owned,level:progress.level,xp:progress.total}}},"knockout",`${opponent.name} vaincu par ${attacker.name}`);
}
export function replaceDeckCard(profile,oldId,newId) {
  if (!profile.deck.includes(oldId) || !profile.collection[newId] || profile.deck.includes(newId)) throw new Error("Choisis une carte possédée qui n’est pas déjà dans ton deck.");
  return { ...profile, deck:profile.deck.map((id) => id === oldId ? newId : id) };
}
export function buyBooster(profile,type) {
  const pack = BOOSTER_TYPES[type];
  if (!pack) throw new Error("Booster inconnu.");
  if (profile.coins < pack.price) throw new Error(`Il faut ${pack.price} or pour acheter ce booster.`);
  return { ...profile, coins:profile.coins-pack.price, boosters:{ ...profile.boosters,[type]:profile.boosters[type]+1 } };
}
export function openBooster(profile,type,random = Math.random) {
  const pack = BOOSTER_TYPES[type];
  if (!pack || profile.boosters[type] < 1) throw new Error("Achète d’abord ce booster dans la boutique.");
  const missing = Array.from({length:151},(_,index)=>index+1).filter(id=>!profile.collection[id]);
  const collection = {...profile.collection};
  const cards = Array.from({length:pack.cards},()=>{
    const pool = missing.length ? missing : Object.keys(collection).map(Number);
    const index = Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));
    const id = pool[index], isNew = !collection[id];
    if (missing.length) missing.splice(index,1);
    if (isNew) collection[id] = {copies:1,level:1,xp:0};
    return {id,isNew};
  });
  return { profile:trackLeagueEvent({ ...profile,boosters:{ ...profile.boosters,[type]:profile.boosters[type]-1 },collection },"pack",`${pack.name} ouvert · ${cards.filter(c=>c.isNew).length} découvertes`),cards };
}
export function recordVictory(profile,trainerId,battleId,random = Math.random,{characterId=profile.characterId} = {}) {
  const trainer = TRAINERS.find(({ id }) => id === trainerId);
  if (!trainer || typeof battleId !== "string" || !battleId) throw new Error("Combat invalide.");
  if (profile.claimedBattles.includes(battleId)) return profile;
  if (!canChallengeTrainer(profile,trainerId)) throw new Error("Remporte d’abord la rencontre précédente sur la route.");
  const roll = max => Math.min(max-1,Math.max(0,Math.floor(random()*max)));
  const base = DIFFICULTIES[trainer.difficulty], boss = trainer.stage % 10 === 0;
  const coins = base.coins + 5 + roll(16) + (boss ? 50 : 0);
  const xp = base.xp + 5 + roll(21) + (boss ? 50 : 0);
  const count = boss ? 3 : 1+roll(2), owned = Object.keys(profile.collection).map(Number);
  const cards = Array.from({ length:count },(_,index) => index === 0 ? owned[roll(owned.length)] : 1+roll(151));
  const collection = Object.fromEntries(Object.entries(profile.collection).map(([id,card]) => [id,{...card}]));
  for (const id of cards) { if (collection[id]) collection[id].copies++; else collection[id] = { copies:1,level:1,xp:0 }; }
  const reward=characterReward({coins,xp},characterId);
  return trackLeagueEvent({ ...profile, adventureWins:profile.adventureWins+1, coins:profile.coins+reward.coins, xp:profile.xp+reward.xp, collection, lastReward:{ battleId,trainerId,coins:reward.coins,xp:reward.xp,cards }, defeatedTrainers:[...new Set([...profile.defeatedTrainers,trainer.id])], claimedBattles:[...profile.claimedBattles,battleId].slice(-1000) },"win",`${trainer.name} vaincu · Étape ${trainer.stage}`);
}

export function recordFreeVictory(profile,trainerId,battleId,{characterId=profile.characterId} = {}) {
  const trainer = FREE_TRAINERS.find(item => item.id === trainerId);
  if (!trainer || typeof battleId !== "string" || !battleId) throw new Error("Combat libre invalide.");
  if (profile.claimedBattles.includes(battleId)) return profile;
  const { coins,xp } = characterReward(freeTrainerReward(trainer.level),characterId);
  return trackLeagueEvent({ ...profile,coins:profile.coins+coins,xp:profile.xp+xp,freeDefeatedTrainers:[...new Set([...(profile.freeDefeatedTrainers ?? []),trainerId])],lastReward:{battleId,trainerId,coins,xp,cards:[]},claimedBattles:[...profile.claimedBattles,battleId].slice(-1000) },"win",`${trainer.name} vaincu · Combat libre`);
}

export function selectCharacter(profile,id) {
  if (id !== null && !getCharacter(id)) throw new Error("Personnage inconnu.");
  return {...profile,characterId:id};
}

// Requested gift: save the cards and receipt together to prevent duplicate claims.
export function claimMewGift(profile) {
  if (profile.claimedGifts?.includes(MEW_GIFT_ID)) return profile;
  const mew = profile.collection[151];
  if ((mew?.copies ?? 0) + 10 > 1000000) throw new Error("La collection contient trop de cartes de Mew.");
  return {...profile,claimedGifts:[...(profile.claimedGifts ?? []),MEW_GIFT_ID],collection:{...profile.collection,151:{copies:(mew?.copies ?? 0)+10,level:mew?.level ?? 1,xp:mew?.xp ?? pokemonXpForLevel(mew?.level ?? 1)}}};
}

export function recordDefeat(profile,battleId,trainerName) {
  if(typeof battleId!=="string"||!battleId)throw new Error("Combat invalide.");
  if(profile.claimedBattles.includes(battleId))return profile;
  return trackLeagueEvent({...profile,claimedBattles:[...profile.claimedBattles,battleId].slice(-1000)},"loss",`Défaite face à ${trainerName}`);
}
