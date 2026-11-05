import { pokemonXpForLevel } from "../src/js/pokemon-levels.js";
import test from "node:test";
import assert from "node:assert/strict";
import { BOOSTER_TYPES,DIFFICULTIES,MAX_LEVEL,STARTER_DECK,TRAINERS,FREE_TRAINERS,FREE_TRAINER_LEVELS,FREE_TRAINER_TIERS,freeTrainerReward,REGIONS,canChallengeTrainer,buyBooster,createProfile,loadProfile,normalizeProfile,openBooster,recordVictory,recordFreeVictory,replaceDeckCard,saveProfile,totalBoosters,xpProgress } from "../src/js/progression-model.js";

test("profil initial : deck demandé, niveau 1, zéro or, XP et booster",()=>{
  const profile=createProfile();assert.deepEqual(profile.deck,[1,4,7,16,19]);assert.equal(profile.version,6);assert.equal(profile.coins,0);assert.equal(profile.xp,0);assert.equal(totalBoosters(profile),0);assert.ok(Object.values(profile.collection).every(card=>card.level===1&&card.copies===1));
});
test("100 rencontres ordonnées dans 10 régions, équipes valides et niveau borné",()=>{
  assert.equal(TRAINERS.length,100);assert.equal(REGIONS.length,10);assert.equal(new Set(TRAINERS.map(item=>item.name)).size,100);assert.equal(new Set(TRAINERS.map(item=>item.id)).size,100);
  for(const [index,trainer] of TRAINERS.entries()){assert.equal(trainer.stage,index+1);assert.equal(trainer.region,Math.floor(index/10));assert.equal(trainer.team.length,5);assert.equal(new Set(trainer.team).size,5);assert.ok(trainer.team.every(id=>id>=1&&id<=151));assert.ok(trainer.level>=1&&trainer.level<=MAX_LEVEL);}
});
test("impossible de sauter une étape ou de rejouer une victoire pour farmer",()=>{
  const initial=createProfile();assert.ok(canChallengeTrainer(initial,"leo"));assert.ok(!canChallengeTrainer(initial,"mia"));assert.throws(()=>recordVictory(initial,"mia","skip"));
  const first=recordVictory(initial,"leo","win-1",()=>0);assert.equal(first.adventureWins,1);assert.ok(canChallengeTrainer(first,"mia"));assert.ok(!canChallengeTrainer(first,"leo"));assert.throws(()=>recordVictory(first,"leo","farm"));assert.equal(initial.adventureWins,0);assert.equal(initial.collection[1].copies,1);
});
test("récompense aléatoire, double garanti, aucune distribution gratuite de booster",()=>{
  const next=recordVictory(createProfile(),"leo","win",()=>0);assert.equal(next.coins,15);assert.equal(next.xp,30);assert.deepEqual(next.lastReward.cards,[1]);assert.equal(next.collection[1].copies,2);assert.equal(totalBoosters(next),0);
  const high=recordVictory(createProfile(),"leo","high",()=>.999);assert.equal(high.coins,30);assert.equal(high.xp,50);assert.deepEqual(high.lastReward.cards,[19,151]);assert.equal(high.collection[151].copies,1);
});
test("rejouer la même attribution ne relance pas le hasard et ne paie pas deux fois",()=>{
  const first=recordVictory(createProfile(),"leo","battle-1",()=>0);assert.equal(recordVictory(first,"leo","battle-1",()=>{throw Error("reroll");}),first);
});
test("parcourir les 100 étapes, bonus des gardiens, fin verrouillée et sauvegarde",()=>{
  let profile=createProfile();
  for(const trainer of TRAINERS){
    assert.ok(canChallengeTrainer(profile,trainer.id));const before=profile;profile=recordVictory(profile,trainer.id,`win-${trainer.stage}`,()=>0);
    assert.equal(profile.adventureWins,trainer.stage);assert.equal(profile.coins-before.coins,DIFFICULTIES[trainer.difficulty].coins+5+(trainer.stage%10===0?50:0));assert.equal(profile.lastReward.cards.length,trainer.stage%10===0?3:1);
    assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(profile))),profile);
  }
  assert.equal(profile.adventureWins,100);assert.equal(profile.defeatedTrainers.length,100);assert.ok(TRAINERS.every(trainer=>!canChallengeTrainer(profile,trainer.id)));assert.equal(totalBoosters(profile),0);
});
test("migration v2 : la route reprend après les victoires consécutives, sans sauter un trou",()=>{
  const old={...createProfile(),version:2,coins:180,xp:200,defeatedTrainers:["leo","hugo","darius"]};delete old.adventureWins;delete old.lastReward;
  const next=normalizeProfile(old);assert.equal(next.adventureWins,1);assert.ok(canChallengeTrainer(next,"mia"));assert.equal(next.coins,180);assert.deepEqual(next.defeatedTrainers,old.defeatedTrainers);
  const advanced=recordVictory(next,"mia","new-win",()=>0);assert.equal(advanced.adventureWins,2);assert.ok(canChallengeTrainer(advanced,"hugo"));
  assert.throws(()=>normalizeProfile({...next,adventureWins:101}));
});
test("trois boosters : 5/10/15 cartes aux prix 50/90/130 or",()=>{
  assert.deepEqual(Object.values(BOOSTER_TYPES).map(pack=>[pack.cards,pack.price]),[[5,50],[10,90],[15,130]]);
  for(const pack of Object.values(BOOSTER_TYPES)){
    const initial={...createProfile(),coins:500};const bought=buyBooster(initial,pack.id);
    assert.equal(bought.coins,500-pack.price);assert.equal(bought.boosters[pack.id],1);assert.equal(totalBoosters(initial),0);assert.equal(initial.coins,500);
    const snapshot=JSON.stringify(bought);const opened=openBooster(bought,pack.id,()=>.99);
    assert.equal(opened.cards.length,pack.cards);assert.equal(opened.profile.boosters[pack.id],0);assert.equal(opened.profile.coins,bought.coins);assert.ok(opened.cards.every(card=>card.isNew && !bought.collection[card.id]));assert.equal(new Set(opened.cards.map(card=>card.id)).size,pack.cards);
    const total=(collection)=>Object.values(collection).reduce((sum,card)=>sum+card.copies,0);assert.equal(total(opened.profile.collection)-total(bought.collection),pack.cards);assert.equal(JSON.stringify(bought),snapshot);
  }
});
test("aucun achat sans or, aucune ouverture sans booster payé",()=>{
  const profile=createProfile();for(const pack of Object.values(BOOSTER_TYPES)){assert.throws(()=>buyBooster(profile,pack.id));assert.throws(()=>openBooster(profile,pack.id));}
  assert.throws(()=>buyBooster({...profile,coins:1000},"inconnu"));assert.equal(profile.coins,0);assert.equal(totalBoosters(profile),0);
});
test("remplacement du deck : cinq cartes uniques et collection conservée",()=>{
  const original=createProfile(),profile={...original,collection:{...original.collection,25:{level:1,copies:1}}};const next=replaceDeckCard(profile,19,25);
  assert.deepEqual(next.deck,[1,4,7,16,25]);assert.equal(next.collection[19].copies,1);assert.deepEqual(profile.deck,STARTER_DECK);assert.throws(()=>replaceDeckCard(profile,19,1));assert.throws(()=>replaceDeckCard(profile,19,150));
});
test("migration de sauvegarde v1 : or, cartes, niveaux, deck et anciens boosters préservés",()=>{
  const old={...createProfile(),version:1,coins:277,boosters:2,collection:{...createProfile().collection,25:{level:3,copies:8}},deck:[1,4,7,16,25],defeatedTrainers:["leo"],claimedBattles:["old-win"]};delete old.xp;
  const next=normalizeProfile(old);assert.equal(next.version,6);assert.equal(next.coins,277);assert.equal(next.xp,0);assert.deepEqual(next.boosters,{small:2,medium:0,large:0});assert.deepEqual(next.deck,old.deck);assert.deepEqual(next.collection[25],{level:3,copies:8,xp:pokemonXpForLevel(3)});assert.deepEqual(next.claimedBattles,["old-win"]);
});
test("XP : passage de niveau et barre correctement remise au niveau suivant",()=>{
  assert.deepEqual(xpProgress(0),{level:1,current:0,required:100,total:0,percent:0});
  assert.equal(xpProgress(99).level,1);assert.equal(xpProgress(100).level,2);assert.equal(xpProgress(100).current,0);assert.equal(xpProgress(100).required,200);assert.equal(xpProgress(299).level,2);assert.equal(xpProgress(300).level,3);assert.equal(xpProgress(300).current,0);
});
test("sauvegarde conserve les trois inventaires, l’XP et les améliorations",()=>{
  const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
  assert.deepEqual(loadProfile(storage),createProfile());let profile={...createProfile(),coins:900,xp:325};profile=buyBooster(profile,"small");profile=buyBooster(profile,"medium");profile=buyBooster(profile,"large");profile=openBooster(profile,"small",()=>0).profile;saveProfile(storage,profile);assert.deepEqual(loadProfile(storage),profile);
  assert.throws(()=>normalizeProfile({...profile,coins:-1}));assert.throws(()=>normalizeProfile({...profile,xp:-1}));assert.throws(()=>saveProfile({setItem:()=>{throw new Error("Stockage plein");}},profile));
});

test("128 dresseurs libres : 4 par palier de 1 à 15, puis de 20 à 100 par pas de 5",()=>{
  assert.equal(FREE_TRAINERS.length,128);assert.equal(new Set(FREE_TRAINERS.map(t=>t.id)).size,128);assert.equal(new Set(FREE_TRAINERS.map(t=>t.name)).size,128);assert.equal(FREE_TRAINER_LEVELS,100);
  for(let level=1;level<=15;level++){assert.equal(FREE_TRAINERS.filter(t=>t.level===level).length,4);assert.ok(FREE_TRAINERS.slice((level-1)*4,level*4).every(t=>t.level===level));}
  assert.deepEqual(["easy","medium","hard"].map(d=>FREE_TRAINERS.filter(t=>t.difficulty===d).length),[20,20,88]);
  assert.deepEqual(FREE_TRAINER_TIERS,[...Array.from({length:15},(_,i)=>i+1),...Array.from({length:17},(_,i)=>20+i*5)]);
  for(const level of FREE_TRAINER_TIERS)assert.equal(FREE_TRAINERS.filter(t=>t.level===level).length,4);
  for(const t of FREE_TRAINERS){assert.ok(!TRAINERS.some(a=>a.id===t.id));assert.equal(new Set(t.team).size,5);assert.ok(t.team.every(id=>id>=1&&id<=151));assert.ok(t.level>=1&&t.level<=100);assert.equal(t.mode,"free");}
});
test("combats libres : gains selon le niveau et revanches récompensées",()=>{
  for(const [level,coins,xp] of [[1,10,25],[5,50,125],[10,100,250],[15,150,375],[20,200,500],[25,250,625],[50,500,1250],[100,1000,2500]]){
    const trainer=FREE_TRAINERS.find(t=>t.level===level),initial=createProfile(),snapshot=JSON.stringify(initial);
    const first=recordFreeVictory(initial,trainer.id,`free-level-${level}-1`),second=recordFreeVictory(first,trainer.id,`free-level-${level}-2`);
    assert.equal(first.coins,coins);assert.equal(first.xp,xp);assert.equal(second.coins,first.coins*2);assert.equal(second.xp,first.xp*2);
    assert.deepEqual(second.freeDefeatedTrainers,[trainer.id]);assert.deepEqual(second.collection,initial.collection);assert.deepEqual(second.boosters,initial.boosters);assert.equal(second.adventureWins,0);assert.deepEqual(second.defeatedTrainers,[]);assert.equal(JSON.stringify(initial),snapshot);
    assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(second))),second);
  }
});
test("une victoire libre n’est payée qu’une fois et ne contourne pas les étapes de l’aventure",()=>{
  const profile=recordVictory(createProfile(),"leo","adventure-first",()=>0);
  const free=recordFreeVictory(profile,"free-darius","free-hard");
  assert.equal(recordFreeVictory(free,"free-darius","free-hard"),free);assert.equal(free.adventureWins,1);assert.deepEqual(free.defeatedTrainers,["leo"]);assert.ok(canChallengeTrainer(free,"mia"));assert.ok(!canChallengeTrainer(free,"darius"));assert.throws(()=>recordVictory(free,"darius","skip"));
  assert.throws(()=>recordVictory(free,"free-leo","wrong-mode"));assert.throws(()=>recordFreeVictory(free,"leo","wrong-mode"));assert.throws(()=>recordFreeVictory(free,"inconnu","invalid"));
});
test("ancienne sauvegarde v3 sans combats libres conservée, suivi des victoires séparé",()=>{
  const old=recordVictory(createProfile(),"leo","old-route",()=>0);delete old.freeDefeatedTrainers;
  const migrated=normalizeProfile(old);assert.deepEqual(migrated.freeDefeatedTrainers,[]);assert.equal(migrated.coins,old.coins);assert.equal(migrated.adventureWins,1);assert.deepEqual(migrated.lastReward,old.lastReward);
  const filtered=normalizeProfile({...migrated,freeDefeatedTrainers:["free-leo","free-leo","inconnu","leo"]});assert.deepEqual(filtered.freeDefeatedTrainers,["free-leo"]);
});

test("les anciens identifiants et leurs victoires restent disponibles parmi les 128 dresseurs",()=>{
  const ids=["leo","mia","hugo","lina","noe","iris","axel","jade","sacha","nora","victor","ambre","orion","selene","darius","olivia","timeo","manon","eden","elise"].map(id=>`free-${id}`);
  assert.ok(ids.every(id=>FREE_TRAINERS.some(t=>t.id===id)));
  const profile=normalizeProfile({...createProfile(),coins:300,freeDefeatedTrainers:ids});assert.equal(profile.freeDefeatedTrainers.length,20);assert.equal(profile.coins,300);
  const final=FREE_TRAINERS[59];assert.equal(final.level,15);assert.equal(recordFreeVictory(profile,final.id,"level-15-win").coins,450);
});

test("les gains versés augmentent strictement à chacun des 32 paliers, identiques pour les quatre adversaires",()=>{
  let previousCoins=0,previousXp=0;
  for(const level of FREE_TRAINER_TIERS){
    const expected=freeTrainerReward(level);assert.ok(expected.coins>previousCoins);assert.ok(expected.xp>previousXp);
    for(const trainer of FREE_TRAINERS.filter(t=>t.level===level)){
      const next=recordFreeVictory(createProfile(),trainer.id,`scaling-${trainer.id}`);
      assert.equal(next.coins,expected.coins);assert.equal(next.xp,expected.xp);assert.equal(next.lastReward.coins,next.coins);assert.equal(next.lastReward.xp,next.xp);
      assert.equal(next.adventureWins,0);assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(next))),next);
    }
    previousCoins=expected.coins;previousXp=expected.xp;
  }
  for(const invalid of [0,16,19,21,99,101,-1,1.5,NaN,"5"])assert.throws(()=>freeTrainerReward(invalid));
});


test("les nouveaux adversaires ont cinq Pokémon réellement au niveau annoncé, jusqu’à 100",()=>{
 const advanced=FREE_TRAINERS.filter(trainer=>trainer.level>=20);
 assert.equal(advanced.length,68);
 for(const level of FREE_TRAINER_TIERS.filter(level=>level>=20)){
  const quartet=advanced.filter(trainer=>trainer.level===level);
  assert.equal(new Set(quartet.map(trainer=>trainer.team.join(","))).size,4);
  for(const trainer of quartet){
   assert.equal(trainer.difficulty,"hard");assert.ok(trainer.portraitIndex>=0&&trainer.portraitIndex<15);
  }
 }
 const champion=advanced.at(-1);
 const won=recordFreeVictory(createProfile(),champion.id,"champion-100");
 assert.equal(won.coins,1000);assert.equal(won.xp,2500);
 assert.equal(recordFreeVictory(won,champion.id,"champion-100"),won);
 assert.deepEqual(normalizeProfile(won).freeDefeatedTrainers,[champion.id]);
});
