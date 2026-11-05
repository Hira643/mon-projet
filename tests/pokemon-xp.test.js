import test from "node:test";
import assert from "node:assert/strict";
import {pokemonXpForLevel,pokemonXpProgress,MAX_POKEMON_XP,attackExperience,knockoutExperience} from "../src/js/pokemon-levels.js";
import {createProfile,normalizeProfile,recordPokemonAttack,saveProfile,loadProfile,openBooster,recordFreeVictory,recordVictory} from "../src/js/progression-model.js";
import {createCard,createBattle,attack,beginTurn,defend,selectPokemon,withPokemonExperience,damageFor} from "../src/js/battle-model.js";
import {cardInfoMarkup} from "../src/js/card-info.js";
const pokemon=(id)=>({id,name:`pokemon-${id}`,sprites:{},types:[{type:{name:"normal"}}],stats:Object.entries({hp:100,attack:40,defense:40,"special-attack":60,"special-defense":40,speed:50}).map(([name,base_stat])=>({stat:{name},base_stat}))});
const setup=()=>{const profile=createProfile();const cards=[...profile.deck,10,13,11,14,129].map(pokemon);return {profile,battle:createBattle(cards,{experience:profile.deck.map(id=>profile.collection[id].xp)})};};
const storage=()=>{let value=null;return {getItem:()=>value,setItem:(_key,next)=>{value=next;}};};

test("les 100 niveaux ont des seuils croissants, une barre remise à zéro et un plafond exact",()=>{
  for(let level=1;level<=100;level++){
    const threshold=pokemonXpForLevel(level),p=pokemonXpProgress(threshold);
    assert.equal(p.level,level);assert.equal(p.current,0);assert.equal(p.maxed,level===100);
    if(level<100){assert.equal(p.required,50*level);assert.equal(pokemonXpProgress(pokemonXpForLevel(level+1)-1).level,level);}
  }
  assert.equal(pokemonXpProgress(49).level,1);assert.equal(pokemonXpProgress(50).level,2);assert.equal(pokemonXpProgress(MAX_POKEMON_XP+1000).total,MAX_POKEMON_XP);assert.equal(pokemonXpProgress(MAX_POKEMON_XP).percent,100);
  for(const invalid of [-1,1.5,NaN,"10"])assert.throws(()=>pokemonXpProgress(invalid));
});
test("seul l’attaquant gagne de l’XP, sans or ni double consommé, et la même attaque ne paie qu’une fois",()=>{
  const {profile,battle}=setup();battle.teams[1][0].hp=1;const next=attack(battle,0,"physical"),earned=recordPokemonAttack(profile,"battle-xp",battle,next);
  assert.equal(earned.collection[1].xp,25);assert.equal(earned.collection[1].level,1);assert.equal(profile.collection[1].xp,0);
  for(const id of [4,7,16,19])assert.deepEqual(earned.collection[id],profile.collection[id]);
  assert.deepEqual(earned.deck,profile.deck);assert.equal(earned.coins,profile.coins);assert.equal(earned.xp,profile.xp);assert.equal(earned.collection[1].copies,1);
  assert.equal(recordPokemonAttack(earned,"battle-xp",battle,next),earned);
});
test("protection, sélection, attaque impossible et actions du robot ne donnent aucune XP",()=>{
  const {profile,battle}=setup();
  for(const next of [defend(battle,0),selectPokemon(battle,0,1),attack(battle,0,"special")])assert.equal(recordPokemonAttack(profile,"nothing",battle,next),profile);
  const enemyTurn=beginTurn(attack(battle,0,"physical"),1),enemyAfter=attack(enemyTurn,1,"physical");
  assert.equal(recordPokemonAttack(profile,"bot",enemyTurn,enemyAfter),profile);
});
test("bonus K.O. et niveau adverse : 25 XP au niveau 1, 95 XP au niveau 15 pour les mêmes statistiques",()=>{
  assert.equal(attackExperience(1),0);assert.equal(attackExperience(1,true),25);assert.equal(attackExperience(15,true),95);
  const {profile,battle}=setup();battle.teams[1][0].hp=1;
  const earned=recordPokemonAttack(profile,"ko",battle,attack(battle,0,"physical"));assert.equal(earned.collection[1].xp,25);assert.equal(earned.collection[1].level,1);
});
test("les quatre attaques donnent de l’XP uniquement sur K.O. ; aucune XP contre une immunité",()=>{
  for(const kind of ["physical","typed","technique","special"]){const {profile,battle}=setup();battle.teams[0][0].charge=3;battle.teams[1][0].hp=1;const next=attack(battle,0,kind);assert.ok(recordPokemonAttack(profile,kind,battle,next).collection[1].xp>0);}
  const {profile,battle}=setup();battle.teams[1][0].types=["ghost"];const next=attack(battle,0,"physical");assert.equal(next.lastEvent.damageApplied,0);assert.equal(recordPokemonAttack(profile,"immune",battle,next).collection[1].xp,0);
});
test("une montée de niveau actualise les six capacités, les PV et les dégâts sans restaurer les blessures",()=>{
  const {profile,battle}=setup();profile.collection[1]={copies:1,level:1,xp:45};battle.teams[0][0].hp=250;battle.teams[0][0].xp=45;battle.teams[1][0].hp=1;
  const attacked=attack(battle,0,"physical"),earned=recordPokemonAttack(profile,"levelup",battle,attacked),next=withPokemonExperience(attacked,0,1,earned.collection[1]);
  const card=next.teams[0][0];assert.equal(card.level,2);assert.equal(card.xp,70);assert.equal(card.maxHp,330);assert.equal(card.hp,280);assert.equal(card.charge,attacked.teams[0][0].charge);
  for(const key of Object.keys(card.stats))assert.ok(card.stats[key]>battle.teams[0][0].stats[key]);assert.ok(damageFor(card,next.teams[1][0],"physical")>damageFor(battle.teams[0][0],next.teams[1][0],"physical"));
  assert.deepEqual(next.teams[0].slice(1),attacked.teams[0].slice(1));assert.deepEqual(next.teams[1],attacked.teams[1]);assert.equal(battle.teams[0][0].hp,250);
});
test("niveau 100 jouable en combat, stats définitives et XP plafonnée",()=>{
  const {profile,battle}=setup();profile.collection[1]={copies:10,level:99,xp:MAX_POKEMON_XP-1};battle.teams[1][0].hp=1;
  const earned=recordPokemonAttack(profile,"max",battle,attack(battle,0,"physical"));assert.equal(earned.collection[1].xp,MAX_POKEMON_XP);assert.equal(earned.collection[1].level,100);
  const card=createCard(pokemon(1),100,null,MAX_POKEMON_XP);assert.equal(card.maxHp,3270);assert.equal(card.stats.attack,436);
  const final=withPokemonExperience(battle,0,1,earned.collection[1]);assert.equal(final.teams[0][0].level,100);assert.ok(attack(final,0,"physical").lastEvent.damageApplied>0);
  const markup=cardInfoMarkup(pokemon(1),earned.collection[1],0);assert.match(markup,/Niveau 100 atteint/);assert.doesNotMatch(markup,/data-campaign-action="upgrade"/);
});
test("migration v1, v2 et v3 : niveaux améliorés, dix Mew, ressources, deck et cadeaux conservés",()=>{
  for(const version of [1,2,3]){
    const old={...createProfile(),version,coins:450,xp:900,claimedGifts:["mew-10-2026-11-03"]};delete old.pokemonAttackClaims;
    old.collection=Object.fromEntries(Object.entries(old.collection).map(([id,card])=>[id,{copies:card.copies,level:card.level}]));old.collection[151]={copies:10,level:8};old.deck=[1,4,7,16,151];
    const next=normalizeProfile(old);assert.equal(next.version,6);assert.equal(next.collection[151].level,8);assert.equal(next.collection[151].copies,10);assert.equal(next.collection[151].xp,pokemonXpForLevel(8));assert.equal(next.coins,450);assert.equal(next.xp,900);assert.deepEqual(next.deck,old.deck);assert.deepEqual(next.claimedGifts,old.claimedGifts);assert.deepEqual(normalizeProfile(next),next);
  }
});
test("l’XP des attaques est sauvée immédiatement et reste acquise après défaite ou sortie, sans récompense de victoire",()=>{
  const {profile,battle}=setup();battle.teams[1][0].hp=1;const next=attack(battle,0,"physical"),earned=recordPokemonAttack(profile,"lost",battle,next),db=storage();saveProfile(db,earned);
  const enemy=beginTurn(next,1);enemy.teams[0].forEach((card,index)=>{card.hp=index===0?1:0;});assert.equal(attack(enemy,1,"physical").winner,1);
  const restored=loadProfile(db);assert.equal(restored.collection[1].xp,25);assert.equal(restored.coins,0);assert.equal(restored.adventureWins,0);assert.equal(recordPokemonAttack(restored,"lost",battle,next),restored);
});
test("les boosters débloquent 5, 10 ou 15 Pokémon différents au niveau 1 et ne donnent jamais d’XP aux Pokémon connus",()=>{
  for(const [type,count] of [["small",5],["medium",10],["large",15]]){
    const {profile}=setup();profile.boosters[type]=1;profile.collection[1].xp=20;
    const opened=openBooster(profile,type,()=>0);assert.equal(opened.cards.length,count);assert.equal(new Set(opened.cards.map(c=>c.id)).size,count);
    assert.ok(opened.cards.every(c=>c.isNew&&opened.profile.collection[c.id].level===1&&opened.profile.collection[c.id].xp===0));assert.deepEqual(opened.profile.collection[1],profile.collection[1]);
  }
  const profile=createProfile();for(let id=1;id<=151;id++)profile.collection[id]={copies:1,level:1,xp:0};profile.boosters.large=1;
  assert.deepEqual(openBooster(profile,"large",()=>0).profile.collection,profile.collection);
});
test("gagner un combat ne distribue pas d’XP Pokémon au banc ; le gain de profil reste séparé",()=>{
  const profile=createProfile();for(const next of [recordFreeVictory(profile,"free-leo","free"),recordVictory(profile,"leo","route",()=>0)]){
    assert.ok(next.xp>0);for(const id of profile.deck){assert.equal(next.collection[id].xp,0);assert.equal(next.collection[id].level,1);}
  }
});

test("migration v4 : niveaux et pourcentages d’XP préservés, conversion effectuée une seule fois",()=>{
  const profile={...createProfile(),version:4,coins:120,xp:300};
  for(const [id,level,xp] of [[1,2,30],[4,10,1200],[7,100,123750],[16,1,20]])profile.collection[id]={copies:1,level,xp};
  const converted=normalizeProfile(profile);assert.equal(converted.version,6);
  assert.deepEqual(converted.collection[1],{copies:1,level:2,xp:60});assert.equal(pokemonXpProgress(converted.collection[1].xp).percent,10);
  assert.equal(converted.collection[4].level,10);assert.equal(converted.collection[7].level,100);assert.equal(converted.collection[16].level,1);
  assert.equal(converted.coins,120);assert.equal(converted.xp,300);assert.deepEqual(converted.deck,profile.deck);
  assert.deepEqual(normalizeProfile(converted),converted);assert.equal(profile.collection[1].xp,30);
});
test("le seuil passe à 50 XP : dix attaques sans K.O. ne donnent rien, deux K.O. donnent un niveau",()=>{
  let {profile,battle}=setup();
  for(let turn=0;turn<10;turn++){
    const next=attack(battle,0,"physical");profile=recordPokemonAttack(profile,"no-ko",battle,next);
    assert.equal(profile.collection[1].xp,0);assert.equal(profile.collection[1].level,1);
    battle=beginTurn(attack(beginTurn(next,1),1,"physical"),0);
  }
  for(let win=0;win<2;win++){
    const duel=setup().battle;duel.teams[1][0].hp=1;
    profile=recordPokemonAttack(profile,`ko-${win}`,duel,attack(duel,0,"physical"));
  }
  assert.equal(profile.collection[1].xp,50);assert.equal(profile.collection[1].level,2);
  assert.equal(pokemonXpProgress(50).required,100);assert.equal(pokemonXpProgress(pokemonXpForLevel(10)).required,500);
});
test("l’XP du K.O. revient au finisseur, pas au Pokémon qui a affaibli la cible",()=>{
  let {profile,battle}=setup();const first=attack(battle,0,"physical");assert.equal(recordPokemonAttack(profile,"finisher",battle,first),profile);
  battle=beginTurn(defend(beginTurn(first,1),1),0);battle=selectPokemon(battle,0,1);battle.teams[1][0].hp=1;
  const next=recordPokemonAttack(profile,"finisher",battle,attack(battle,0,"physical"));
  assert.equal(next.collection[1].xp,0);assert.equal(next.collection[4].xp,25);assert.equal(next.collection[7].xp,0);
});
test("un drapeau K.O. sans cible réellement mise à zéro ne donne pas d’XP",()=>{
  const {profile,battle}=setup(),next=attack(battle,0,"physical");next.lastEvent.knockedOut=true;
  assert.equal(recordPokemonAttack(profile,"invalid-ko",battle,next),profile);
});

test("plus le Pokémon vaincu est fort, plus le montant prévu et l’XP réellement créditée augmentent",()=>{
  const payouts=[];
  for(const [index,[level,statScale]] of [[1,0.5],[1,1],[1,2],[5,2],[15,2]].entries()){
    const {profile,battle}=setup();
    const strong=pokemon(10);strong.stats=strong.stats.map(item=>({...item,base_stat:item.base_stat*statScale}));
    const enemy=createCard(strong,level);enemy.hp=1;battle.teams[1][0]=enemy;
    const prediction=knockoutExperience(enemy),after=attack(battle,0,"physical");
    const earned=recordPokemonAttack(profile,`strong-${index}`,battle,after);
    assert.equal(earned.collection[1].xp,prediction);assert.equal(earned.coins,0);assert.equal(earned.collection[4].xp,0);
    assert.equal(recordPokemonAttack(earned,`strong-${index}`,battle,after),earned);
    payouts.push(prediction);
  }
  assert.deepEqual(payouts,[13,25,50,90,190]);assert.ok(payouts.every((value,index)=>index===0||value>payouts[index-1]));
});
test("la récompense augmente à chacun des 100 niveaux adverses et ignore les PV restants et la protection",()=>{
  let previous=0;
  for(let level=1;level<=100;level++){
    const enemy=createCard(pokemon(10),level),full=knockoutExperience(enemy);
    assert.ok(full>previous);previous=full;
    enemy.hp=1;enemy.guard=true;assert.equal(knockoutExperience(enemy),full);
    assert.equal(attackExperience(level,false,enemy.baseStats),0);
  }
  assert.throws(()=>attackExperience(1,true,{}));assert.throws(()=>attackExperience(0,true));
});


test("migration v5 vers v6 : niveaux, ressources et progression conservés, conversion unique",()=>{
 const old={...createProfile(),version:5,coins:220,xp:1250,boosters:{small:2,medium:1,large:1}};
 for(const [id,level,xp] of [[1,1,99],[4,2,120],[7,10,4800],[16,100,495000]])old.collection[id]={copies:3,level,xp};
 const next=normalizeProfile(old);
 assert.equal(next.version,6);
 assert.deepEqual(next.collection[1],{copies:3,level:1,xp:49});
 assert.deepEqual(next.collection[4],{copies:3,level:2,xp:60});
 assert.equal(pokemonXpProgress(next.collection[4].xp).percent,10);
 assert.equal(next.collection[7].level,10);assert.equal(next.collection[16].level,100);
 assert.equal(next.coins,old.coins);assert.equal(next.xp,old.xp);
 assert.deepEqual(next.boosters,old.boosters);assert.deepEqual(next.deck,old.deck);
 assert.equal(old.collection[4].xp,120);assert.deepEqual(normalizeProfile(next),next);
 const db=storage();saveProfile(db,next);assert.deepEqual(loadProfile(db),next);
});
