export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
export const ITEMS = {
  potion:{id:"potion",name:"Potion",icon:"✚",price:15,heal:.35,description:"Restaure 35 % des PV max du Pokémon actif."},
  superpotion:{id:"superpotion",name:"Super Potion",icon:"✚",price:35,heal:.7,description:"Restaure 70 % des PV max du Pokémon actif."},
  ether:{id:"ether",name:"Éther",icon:"ϟ",price:25,charge:1,description:"Ajoute 1 charge spéciale au Pokémon actif."}
};
const amount = value => Number.isSafeInteger(value) && value>=0 && value<=1000000000 ? value : 0;
export function createLeague(day=localDay()) {
  return {stats:{wins:0,losses:0,knockouts:0,boostersOpened:0,streak:0,bestStreak:0},items:{potion:3,superpotion:0,ether:1},favorites:[],claimedAchievements:[],daily:{day,wins:0,knockouts:0,boostersOpened:0,claimed:[]},settings:{sound:false,motion:true},history:[]};
}
export const ACHIEVEMENTS = [
  {id:"first-win",name:"Le premier pas",description:"Remporte ton premier combat.",metric:"wins",target:1,coins:25,xp:25,icon:"⚑"},
  {id:"win-5",name:"La relève de Kanto",description:"Remporte 5 combats.",metric:"wins",target:5,coins:60,xp:50,icon:"⚔"},
  {id:"win-25",name:"Dresseur redoutable",description:"Remporte 25 combats.",metric:"wins",target:25,coins:200,xp:150,icon:"♜"},
  {id:"streak-5",name:"Inarrêtable",description:"Gagne 5 combats de suite.",metric:"bestStreak",target:5,coins:100,xp:100,icon:"ϟ"},
  {id:"ko-10",name:"Le coup décisif",description:"Mets 10 Pokémon adverses K.O..",metric:"knockouts",target:10,coins:60,xp:50,icon:"✦"},
  {id:"ko-100",name:"Maître du duel",description:"Mets 100 Pokémon adverses K.O..",metric:"knockouts",target:100,coins:250,xp:200,icon:"✹"},
  {id:"collection-15",name:"Esprit de collection",description:"Débloque 15 Pokémon différents.",metric:"collection",target:15,coins:60,xp:50,icon:"◇"},
  {id:"collection-50",name:"Le grand carnet",description:"Débloque 50 Pokémon différents.",metric:"collection",target:50,coins:180,xp:150,icon:"◈"},
  {id:"collection-151",name:"Tous réunis",description:"Complète les 151 Pokémon de Kanto.",metric:"collection",target:151,coins:1000,xp:1000,icon:"♛"},
  {id:"level-10",name:"Un lien qui grandit",description:"Entraîne un Pokémon au niveau 10.",metric:"pokemonLevel",target:10,coins:100,xp:100,icon:"↟"},
  {id:"level-50",name:"Partenaires de légende",description:"Entraîne un Pokémon au niveau 50.",metric:"pokemonLevel",target:50,coins:400,xp:350,icon:"✧"},
  {id:"adventure-10",name:"Au-delà des prairies",description:"Remporte les 10 premières étapes.",metric:"adventure",target:10,coins:100,xp:100,icon:"⌖"},
  {id:"adventure-50",name:"L’horizon se rapproche",description:"Remporte 50 étapes de l’aventure.",metric:"adventure",target:50,coins:400,xp:300,icon:"△"},
  {id:"adventure-100",name:"La couronne de Kanto",description:"Termine les 100 étapes de l’aventure.",metric:"adventure",target:100,coins:1000,xp:750,icon:"♛"}
];
export const DAILY_MISSIONS = [
  {id:"daily-wins",name:"Prêt pour le duel",description:"Remporte 2 combats aujourd’hui.",metric:"wins",target:2,coins:30,xp:25,icon:"⚔"},
  {id:"daily-ko",name:"Des coups qui comptent",description:"Mets 5 adversaires K.O. aujourd’hui.",metric:"knockouts",target:5,coins:40,xp:50,icon:"✦"},
  {id:"daily-pack",name:"Une nouvelle rencontre",description:"Ouvre 1 booster aujourd’hui.",metric:"boostersOpened",target:1,coins:25,xp:25,icon:"◇"}
];
export function normalizeLeague(raw,profile={},day=localDay()) {
  const fresh=createLeague(day),source=raw && typeof raw==="object" ? raw : {};
  const stats=Object.fromEntries(Object.keys(fresh.stats).map(key=>[key,amount(source.stats?.[key])]));
  if (!raw) stats.wins=(profile.adventureWins??0)+(profile.freeDefeatedTrainers?.length??0);
  const daily=source.daily?.day===day ? {day,...Object.fromEntries(["wins","knockouts","boostersOpened"].map(key=>[key,amount(source.daily[key])])),claimed:Array.isArray(source.daily.claimed)?[...new Set(source.daily.claimed.filter(id=>DAILY_MISSIONS.some(m=>m.id===id)))]:[]} : fresh.daily;
  return {stats,items:Object.fromEntries(Object.keys(ITEMS).map(id=>[id,source.items ? amount(source.items[id]) : fresh.items[id]])),favorites:Array.isArray(source.favorites)?[...new Set(source.favorites.filter(id=>Number.isInteger(id)&&profile.collection?.[id]))]:[],claimedAchievements:Array.isArray(source.claimedAchievements)?[...new Set(source.claimedAchievements.filter(id=>ACHIEVEMENTS.some(a=>a.id===id)))]:[],daily,settings:{sound:source.settings?.sound===true,motion:source.settings?.motion!==false},history:Array.isArray(source.history)?source.history.filter(e=>e&&["win","loss","knockout","pack","mission"].includes(e.type)&&typeof e.label==="string").slice(-12).map(e=>({type:e.type,label:e.label.slice(0,120)})):[]};
}
export function trackLeagueEvent(profile,type,label="",day=localDay()) {
  const league=normalizeLeague(profile.league,profile,day),stats={...league.stats},daily={...league.daily};
  if(type==="win"){stats.wins++;daily.wins++;stats.streak++;stats.bestStreak=Math.max(stats.bestStreak,stats.streak);}
  if(type==="loss"){stats.losses++;stats.streak=0;}
  if(type==="knockout"){stats.knockouts++;daily.knockouts++;}
  if(type==="pack"){stats.boostersOpened++;daily.boostersOpened++;}
  return {...profile,league:{...league,stats,daily,history:[...league.history,{type,label:label||({win:"Victoire en combat",loss:"Combat perdu",knockout:"Pokémon adverse mis K.O.",pack:"Booster ouvert",mission:"Récompense récupérée"}[type]??"Progression")}].slice(-12)}};
}
export function achievementValue(profile,metric) {
  const league=normalizeLeague(profile.league,profile);
  if(metric==="collection")return Object.keys(profile.collection).length;
  if(metric==="pokemonLevel")return Math.max(1,...Object.values(profile.collection).map(card=>card.level));
  if(metric==="adventure")return profile.adventureWins;
  return league.stats[metric]??0;
}
export function missionState(profile,daily=false,day=localDay()) {
  const league=normalizeLeague(profile.league,profile,day);
  return (daily?DAILY_MISSIONS:ACHIEVEMENTS).map(m=>({...m,value:Math.min(m.target,daily?league.daily[m.metric]:achievementValue(profile,m.metric)),claimed:(daily?league.daily.claimed:league.claimedAchievements).includes(m.id)}));
}
export function claimMission(profile,id,day=localDay()) {
  const daily=DAILY_MISSIONS.some(m=>m.id===id),mission=missionState(profile,daily,day).find(m=>m.id===id);
  if(!mission)throw new Error("Objectif inconnu.");
  if(mission.claimed)throw new Error("Récompense déjà récupérée.");
  if(mission.value<mission.target)throw new Error("Termine cet objectif avant de récupérer sa récompense.");
  let league=normalizeLeague(profile.league,profile,day);
  league=daily?{...league,daily:{...league.daily,claimed:[...league.daily.claimed,id]}}:{...league,claimedAchievements:[...league.claimedAchievements,id]};
  return trackLeagueEvent({...profile,coins:profile.coins+mission.coins,xp:profile.xp+mission.xp,league},"mission",`${mission.name} · +${mission.coins} or`,day);
}
export function buyItem(profile,id) {
  const item=ITEMS[id];if(!item)throw new Error("Objet inconnu.");
  if(profile.coins<item.price)throw new Error(`Il faut ${item.price} or pour cet objet.`);
  const league=normalizeLeague(profile.league,profile);
  return {...profile,coins:profile.coins-item.price,league:{...league,items:{...league.items,[id]:league.items[id]+1}}};
}
export function consumeItem(profile,id) {
  const league=normalizeLeague(profile.league,profile);
  if(!ITEMS[id]||league.items[id]<1)throw new Error("Cet objet n’est pas disponible dans ton sac.");
  return {...profile,league:{...league,items:{...league.items,[id]:league.items[id]-1}}};
}
export function toggleFavorite(profile,id) {
  if(!profile.collection[id])throw new Error("Débloque d’abord ce Pokémon.");
  const league=normalizeLeague(profile.league,profile),favorites=league.favorites.includes(id)?league.favorites.filter(item=>item!==id):[...league.favorites,id];
  return {...profile,league:{...league,favorites}};
}
export function updateSettings(profile,settings) {
  const league=normalizeLeague(profile.league,profile);
  return {...profile,league:{...league,settings:{sound:settings.sound??league.settings.sound,motion:settings.motion??league.settings.motion}}};
}
