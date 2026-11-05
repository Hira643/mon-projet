import test from "node:test";
import assert from "node:assert/strict";
import { CHARACTERS,getCharacter,characterEffects } from "../src/js/characters.js";
import { createProfile,normalizeProfile,selectCharacter,recordVictory,recordFreeVictory,saveProfile,loadProfile } from "../src/js/progression-model.js";
import { createCard,createBattle,damageFor,attack,beginTurn,selectPokemon } from "../src/js/battle-model.js";
const pokemon=(id,hp=100,types=["normal"])=>({id,name:`pokemon-${id}`,sprites:{},types:types.map(name=>({type:{name}})),stats:Object.entries({hp,attack:40,defense:40,"special-attack":60,"special-defense":40,speed:50}).map(([name,base_stat])=>({stat:{name},base_stat}))});
const cards=()=>Array.from({length:10},(_,i)=>pokemon(i+1));

test("neuf personnages sélectionnables gratuitement, un seul équipé et aucune ressource modifiée",()=>{
  assert.equal(CHARACTERS.length,9);assert.equal(new Set(CHARACTERS.map(c=>c.id)).size,9);assert.equal(new Set(CHARACTERS.map(c=>c.portrait)).size,9);
  const initial={...createProfile(),coins:270,xp:450},snapshot=JSON.stringify(initial);
  for(const character of CHARACTERS){const next=selectCharacter(initial,character.id);assert.equal(next.characterId,character.id);assert.equal(next.coins,270);assert.equal(next.xp,450);assert.deepEqual(next.collection,initial.collection);assert.deepEqual(next.deck,initial.deck);}
  const switched=selectCharacter(selectCharacter(initial,"aurore"),"soren");assert.equal(switched.characterId,"soren");assert.equal(createCard(pokemon(1),1,switched.characterId).maxHp,330);
  assert.equal(selectCharacter(switched,null).characterId,null);assert.throws(()=>selectCharacter(initial,"inconnu"));assert.equal(JSON.stringify(initial),snapshot);
});
test("le personnage est sauvegardé et les anciennes sauvegardes conservent leur progression",()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  const profile=selectCharacter({...createProfile(),coins:331,xp:550,adventureWins:2,defeatedTrainers:["leo","mia"]},"lyra");saveProfile(storage,profile);assert.deepEqual(loadProfile(storage),profile);
  const old={...profile};delete old.characterId;const migrated=normalizeProfile(old);assert.equal(migrated.characterId,null);assert.equal(migrated.coins,331);assert.equal(migrated.xp,550);assert.equal(migrated.adventureWins,2);assert.deepEqual(migrated.collection,profile.collection);assert.equal(normalizeProfile({...profile,characterId:"unknown"}).characterId,null);
});
test("Aurore : PV +25 % après les niveaux et le multiplicateur ×3, seulement pour l’équipe du joueur",()=>{
  const source=pokemon(1),snapshot=JSON.stringify(source);assert.equal(createCard(source,1,"aurore").maxHp,375);assert.equal(createCard(source,2,"aurore").maxHp,413);assert.equal(createCard(pokemon(1,45),1,"aurore").maxHp,169);assert.equal(JSON.stringify(source),snapshot);
  const battle=createBattle(cards(),{playerCharacterId:"aurore"});assert.ok(battle.teams[0].every(card=>card.hp===375&&card.characterId==="aurore"));assert.ok(battle.teams[1].every(card=>card.hp===300&&card.characterId===null));assert.equal(createBattle(cards()).teams[0][0].maxHp,300);
});
test("Kael et Lyra : bonus sur la bonne catégorie d’attaque, prévisions et dégâts appliqués cohérents",()=>{
  const plain=createCard(pokemon(1)),defender=createCard(pokemon(2)),kael=createCard(pokemon(1),1,"kael"),lyra=createCard(pokemon(1),1,"lyra");
  assert.equal(damageFor(plain,defender,"physical"),25);assert.equal(damageFor(kael,defender,"physical"),30);assert.equal(damageFor(kael,defender,"special"),80);assert.equal(damageFor(lyra,defender,"physical"),25);assert.equal(damageFor(lyra,defender,"special"),100);
  const battle=createBattle(cards(),{playerCharacterId:"kael"}),after=attack(battle,0,"physical");assert.equal(after.teams[1][0].hp,270);assert.equal(after.lastEvent.damageApplied,30);assert.equal(battle.teams[1][0].hp,300);
});
test("Bastien : réduction des dégâts, cumul avec la protection et respect des immunités",()=>{
  const attacker=createCard(pokemon(1)),protectedCard=createCard(pokemon(2),1,"bastien");assert.equal(damageFor(attacker,protectedCard,"physical"),21);assert.equal(damageFor(attacker,{...protectedCard,guard:true},"physical"),11);
  const ghost=createCard(pokemon(2,100,["ghost"]),1,"bastien");assert.equal(damageFor(createCard(pokemon(1),1,"kael"),ghost,"physical"),0);
});
test("Naya : une charge sur les cinq cartes, pas de recharge gratuite au changement de Pokémon",()=>{
  let state=createBattle(cards(),{playerCharacterId:"naya"});assert.ok(state.teams[0].every(card=>card.charge===1));assert.ok(state.teams[1].every(card=>card.charge===0));assert.equal(attack(state,0,"special"),state);
  state=selectPokemon(state,0,1);state=selectPokemon(state,0,0);assert.equal(state.teams[0][0].charge,1);state=attack(state,0,"physical");state=beginTurn(state,1);state=attack(state,1,"physical");state=beginTurn(state,0);assert.equal(state.teams[0][0].charge,2);state=attack(state,0,"technique");assert.equal(state.teams[0][0].charge,0);assert.equal(state.teams[0][1].charge,1);
});
test("Soren : PV et les deux catégories de dégâts à +10 %, sans cumul avec le précédent personnage",()=>{
  const soren=createCard(pokemon(1),1,"soren"),target=createCard(pokemon(2));assert.equal(soren.maxHp,330);assert.equal(damageFor(soren,target,"physical"),28);assert.equal(damageFor(soren,target,"special"),88);assert.equal(soren.charge,0);
  const effects=characterEffects("aurore");effects.hp=99;assert.equal(characterEffects("aurore").hp,1.25);assert.equal(getCharacter("inconnu"),null);
});
test("Milo, Énora et Tess : bonus d’or et XP réellement crédités dans les deux modes",()=>{
  for(const [character,freeGold,freeXp,adventureGold,adventureXp] of [["milo",14,25,21,30],["enora",10,38,15,45],["tess",12,30,18,36]]){
    const profile=selectCharacter(createProfile(),character),free=recordFreeVictory(profile,"free-leo",`free-${character}`),adventure=recordVictory(profile,"leo",`route-${character}`,()=>0);
    assert.equal(free.coins,freeGold);assert.equal(free.xp,freeXp);assert.equal(adventure.coins,adventureGold);assert.equal(adventure.xp,adventureXp);assert.equal(free.lastReward.coins,freeGold);assert.equal(adventure.lastReward.xp,adventureXp);assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(free))),free);
  }
});
test("les récompenses utilisent le personnage du début de combat et restent idempotentes",()=>{
  const profile=selectCharacter(createProfile(),"milo"),changed=selectCharacter(profile,"enora");
  const win=recordFreeVictory(changed,"free-leo","snapshot-win",{characterId:profile.characterId});assert.equal(win.coins,14);assert.equal(win.xp,25);assert.equal(win.characterId,"enora");assert.equal(recordFreeVictory(selectCharacter(win,"tess"),"free-leo","snapshot-win").coins,14);
  const noHero=recordFreeVictory(profile,"free-leo","started-without",{characterId:null});assert.equal(noHero.coins,10);assert.equal(noHero.xp,25);
  const route=recordVictory(changed,"leo","route-snapshot",()=>0,{characterId:"milo"});assert.equal(route.coins,21);assert.equal(route.xp,30);assert.equal(recordVictory(route,"leo","route-snapshot",()=>{throw Error("reroll");}),route);
});
