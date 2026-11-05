import test from "node:test";
import assert from "node:assert/strict";
import {createProfile,normalizeProfile,saveProfile,loadProfile,recordFreeVictory,recordDefeat,recordPokemonAttack,buyBooster,openBooster} from "../src/js/progression-model.js";
import {createLeague,normalizeLeague,trackLeagueEvent,claimMission,missionState,buyItem,consumeItem,toggleFavorite,updateSettings,ITEMS} from "../src/js/league-model.js";
import {createBattle,attack,useBattleItem,beginTurn} from "../src/js/battle-model.js";
const pokemon=id=>({id,name:`pokemon-${id}`,sprites:{},types:[{type:{name:"normal"}}],stats:Object.entries({hp:100,attack:40,defense:40,"special-attack":60,"special-defense":40,speed:50}).map(([name,base_stat])=>({stat:{name},base_stat}))});
const battle=()=>createBattle([...createProfile().deck,10,13,11,14,129].map(pokemon));
test("migration : anciennes ressources intactes, sac initial et réglages sans activation sonore",()=>{
 const old=createProfile();delete old.league;old.coins=220;old.collection[151]={copies:10,level:3,xp:150};old.adventureWins=10;old.freeDefeatedTrainers=["free-leo"];
 const migrated=normalizeProfile(old);assert.equal(migrated.coins,220);assert.deepEqual(migrated.collection,old.collection);assert.deepEqual(migrated.deck,old.deck);assert.equal(migrated.adventureWins,10);assert.equal(migrated.league.stats.wins,11);assert.deepEqual(migrated.league.items,{potion:3,superpotion:0,ether:1});assert.equal(migrated.league.settings.sound,false);assert.deepEqual(normalizeProfile(migrated),migrated);
});
test("victoires et défaites alimentent les statistiques une seule fois, séries réinitialisées après défaite",()=>{
 const first=recordFreeVictory(createProfile(),"free-leo","one"),second=recordFreeVictory(first,"free-leo","two");
 assert.equal(second.league.stats.wins,2);assert.equal(second.league.stats.streak,2);assert.equal(second.league.stats.bestStreak,2);assert.equal(recordFreeVictory(second,"free-leo","two"),second);
 const lost=recordDefeat(second,"lost","Mia");assert.equal(lost.league.stats.losses,1);assert.equal(lost.league.stats.streak,0);assert.equal(lost.league.stats.bestStreak,2);assert.equal(lost.coins,second.coins);assert.deepEqual(lost.collection,second.collection);assert.equal(recordDefeat(lost,"lost","Mia"),lost);
});
test("les K.O. comptent pour le journal et les missions, sans compter une attaque ordinaire",()=>{
 const profile=createProfile(),state=battle(),ordinary=attack(state,0,"physical");assert.equal(recordPokemonAttack(profile,"one",state,ordinary),profile);
 state.teams[1][0].hp=1;const after=attack(state,0,"physical"),earned=recordPokemonAttack(profile,"one",state,after);
 assert.equal(earned.league.stats.knockouts,1);assert.equal(earned.league.daily.knockouts,1);assert.equal(recordPokemonAttack(earned,"one",state,after),earned);assert.equal(earned.collection[4].xp,0);
});
test("objectifs : impossible de réclamer avant la fin ou deux fois ; récompense uniquement pour le profil",()=>{
 const profile=createProfile();assert.throws(()=>claimMission(profile,"first-win"));assert.throws(()=>claimMission(profile,"unknown"));
 const winner=recordFreeVictory(profile,"free-leo","win"),rewarded=claimMission(winner,"first-win");
 assert.equal(rewarded.coins,winner.coins+25);assert.equal(rewarded.xp,winner.xp+25);assert.deepEqual(rewarded.collection,winner.collection);assert.deepEqual(rewarded.boosters,winner.boosters);assert.throws(()=>claimMission(rewarded,"first-win"));assert.equal(profile.league.claimedAchievements.length,0);
});
test("missions quotidiennes : minuit remet les compteurs à zéro sans effacer succès, inventaire ou totaux",()=>{
 let profile={...createProfile(),league:createLeague("2026-11-03")};profile=trackLeagueEvent(profile,"win","","2026-11-03");profile=trackLeagueEvent(profile,"win","","2026-11-03");
 assert.equal(missionState(profile,true,"2026-11-03")[0].value,2);profile=claimMission(profile,"daily-wins","2026-11-03");assert.throws(()=>claimMission(profile,"daily-wins","2026-11-03"));
 const tomorrow=normalizeLeague(profile.league,profile,"2026-11-04");assert.equal(tomorrow.daily.wins,0);assert.deepEqual(tomorrow.daily.claimed,[]);assert.equal(tomorrow.stats.wins,2);assert.deepEqual(tomorrow.items,profile.league.items);
 assert.throws(()=>claimMission({...profile,league:tomorrow},"daily-wins","2026-11-04"));
});
test("achat d’objets : prix exact, inventaire, refus sans or et absence de mutation",()=>{
 const profile={...createProfile(),coins:100};for(const item of Object.values(ITEMS)){const next=buyItem(profile,item.id);assert.equal(next.coins,100-item.price);assert.equal(next.league.items[item.id],profile.league.items[item.id]+1);assert.equal(profile.coins,100);}
 assert.throws(()=>buyItem(createProfile(),"potion"));assert.throws(()=>buyItem(profile,"unknown"));assert.throws(()=>consumeItem(profile,"superpotion"));assert.equal(consumeItem(profile,"potion").league.items.potion,2);assert.equal(profile.league.items.potion,3);
});
test("potion : soin plafonné, un tour consommé, aucune XP et aucune résurrection",()=>{
 const profile=createProfile(),state=battle();state.teams[0][0].hp=250;
 const next=useBattleItem(state,0,ITEMS.potion);assert.equal(next.teams[0][0].hp,300);assert.equal(next.phase,"handoff");assert.equal(next.turn,1);assert.equal(recordPokemonAttack(profile,"item",state,next),profile);assert.equal(state.teams[0][0].hp,250);assert.deepEqual(next.teams[0].slice(1),state.teams[0].slice(1));
 assert.equal(useBattleItem(battle(),0,ITEMS.potion).lastEvent,null);state.teams[0][0].hp=0;assert.equal(useBattleItem(state,0,ITEMS.potion),state);assert.equal(useBattleItem(state,1,ITEMS.potion),state);
});
test("éther : charge plafonnée, pas de consommation au maximum ni de double action",()=>{
 const state=battle(),next=useBattleItem(state,0,ITEMS.ether);assert.equal(next.teams[0][0].charge,1);assert.equal(next.phase,"handoff");assert.equal(useBattleItem(next,0,ITEMS.ether),next);state.teams[0][0].charge=3;assert.equal(useBattleItem(state,0,ITEMS.ether),state);assert.equal(useBattleItem(state,0,{heal:-1}),state);
});
test("les ouvertures comptent une fois pour les missions sans XP Pokémon ni boosters gratuits",()=>{
 const profile={...createProfile(),coins:100};const bought=buyBooster(profile,"small"),opened=openBooster(bought,"small",()=>0).profile;
 assert.equal(opened.league.stats.boostersOpened,1);assert.equal(opened.league.daily.boostersOpened,1);assert.equal(opened.boosters.small,0);assert.equal(opened.collection[1].xp,0);assert.throws(()=>openBooster(opened,"small"));
});
test("favoris et réglages sont sauvegardés ; données invalides filtrées et historique borné",()=>{
 let profile=toggleFavorite(createProfile(),1);profile=updateSettings(profile,{sound:true,motion:false});assert.deepEqual(profile.league.favorites,[1]);assert.deepEqual(profile.league.settings,{sound:true,motion:false});assert.throws(()=>toggleFavorite(profile,151));assert.deepEqual(toggleFavorite(profile,1).league.favorites,[]);
 for(let i=0;i<20;i++)profile=trackLeagueEvent(profile,"knockout",`K.O. ${i}`);assert.equal(profile.league.history.length,12);
 let value;const db={getItem:()=>value??null,setItem:(_,next)=>{value=next;}};saveProfile(db,profile);assert.deepEqual(loadProfile(db),profile);
 const clean=normalizeLeague({...profile.league,favorites:[1,1,999],items:{potion:-1},claimedAchievements:["fake"],settings:{sound:"yes",motion:false}},profile);assert.deepEqual(clean.favorites,[1]);assert.equal(clean.items.potion,0);assert.deepEqual(clean.claimedAchievements,[]);assert.equal(clean.settings.sound,false);
});
