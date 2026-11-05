import test from "node:test";
import { MAX_BATTLE_LEVEL, movesFor, availableMoves } from "../src/js/battle-model.js";
import assert from "node:assert/strict";
import { attack,beginTurn,canSpecial,createBattle,createCard,damageDetails,damageFor,defend,drawPokemonIds,selectPokemon,typeMultiplier } from "../src/js/battle-model.js";
import { chooseBotAction } from "../src/js/bot.js";

function pokemon(id,types=["normal"],overrides={}) {
  const stats={ hp:100,attack:40,defense:40,"special-attack":50,"special-defense":40,speed:50,...overrides };
  return { id,name:`pokemon-${id}`,types:types.map((name)=>({type:{name}})),sprites:{},stats:Object.entries(stats).map(([name,base_stat])=>({stat:{name},base_stat})) };
}
const fresh=()=>createBattle(Array.from({length:10},(_,i)=>pokemon(i+1)));
function round(state) {
  state=attack(state,0,"physical");state=beginTurn(state,1);state=attack(state,1,"physical");return beginTurn(state,0);
}

test("dix cartes uniques parmi les 151, cinq cartes par équipe",()=>{
  for(let i=0;i<50;i++){const ids=drawPokemonIds();assert.equal(ids.length,10);assert.equal(new Set(ids).size,10);assert.ok(ids.every(id=>id>=1&&id<=151));}
  assert.deepEqual(fresh().teams.map(team=>team.length),[5,5]);
  assert.throws(()=>createBattle([pokemon(1)]));
  assert.throws(()=>createBattle(Array.from({length:10},()=>pokemon(1))));
});
test("PV multipliés par trois, stats intactes au niveau 1, API non modifiée",()=>{
  const source=pokemon(1), snapshot=JSON.stringify(source), card=createCard(source);
  assert.equal(card.maxHp,300);assert.equal(card.hp,300);assert.equal(card.stats.attack,40);assert.equal(card.charge,0);assert.equal(card.guard,false);assert.equal(JSON.stringify(source),snapshot);
  const upgraded=createCard(source,2);assert.equal(upgraded.maxHp,330);assert.equal(upgraded.stats.attack,44);assert.throws(()=>createCard(source,0));
});
test("une spéciale non chargée est refusée sans consommer le tour",()=>{
  const state=fresh();assert.equal(attack(state,0,"special"),state);assert.equal(state.turn,0);assert.equal(state.teams[0][0].charge,0);
});
test("trois tours de charge, spéciale disponible puis remise à zéro",()=>{
  let state=fresh();for(let i=0;i<3;i++)state=round(state);
  assert.equal(state.teams[0][0].charge,3);assert.equal(canSpecial(state.teams[0][0]),true);
  const before=state.teams[1][0].hp;const after=attack(state,0,"special");
  assert.equal(after.teams[0][0].charge,0);assert.ok(after.teams[1][0].hp<before);assert.equal(after.turn,1);assert.equal(state.teams[0][0].charge,3);
});
test("la charge appartient à chaque carte et reste après un changement",()=>{
  let state=fresh();state.teams[0][0].charge=3;state=selectPokemon(state,0,1);
  assert.equal(state.teams[0][1].charge,0);assert.equal(attack(state,0,"special"),state);
  state=selectPokemon(state,0,0);assert.equal(state.teams[0][0].charge,3);
  assert.equal(selectPokemon(state,1,1),state);
  state.teams[0][2].hp=0;assert.equal(selectPokemon(state,0,2),state);
});
test("protection : un tour, une charge, dégâts divisés par deux puis protection consommée",()=>{
  const original=fresh();let state=defend(original,0);
  assert.equal(state.phase,"handoff");assert.equal(state.turn,1);assert.equal(state.teams[0][0].charge,1);assert.equal(state.teams[0][0].guard,true);
  state=beginTurn(state,1);const expected=damageFor(state.teams[1][0],state.teams[0][0],"physical");
  const plain=damageFor(state.teams[1][0],{...state.teams[0][0],guard:false},"physical");
  assert.equal(expected,Math.round(plain/2));state=attack(state,1,"physical");
  assert.equal(state.teams[0][0].hp,300-expected);assert.equal(state.teams[0][0].guard,false);assert.equal(original.teams[0][0].guard,false);
});
test("faiblesses, doubles faiblesses, résistances et immunités PokéAPI",()=>{
  const fire=createCard(pokemon(4,["fire"])), grass=createCard(pokemon(1,["grass"]));
  const neutral=createCard(pokemon(7,["normal"]));
  assert.equal(typeMultiplier("fire",["grass","bug"]),4);
  assert.equal(typeMultiplier("fire",["water"]),.5);
  assert.equal(typeMultiplier("electric",["ground"]),0);
  assert.equal(damageDetails(fire,grass,"special").multiplier,2);
  assert.equal(damageFor(fire,grass,"special"),damageFor(fire,neutral,"special")*2);
  assert.equal(damageFor(neutral,createCard(pokemon(8,["ghost"])),"physical"),0);
});
test("immunité : aucun PV perdu, mais l’action charge la spéciale et passe le tour",()=>{
  let state=fresh();state.teams[1][0].types=["ghost"];
  const after=attack(state,0,"physical");assert.equal(after.teams[1][0].hp,300);assert.equal(after.teams[0][0].charge,1);assert.equal(after.turn,1);assert.match(after.log.at(-1),/immunité/);
});
test("alternance stricte, pas de double attaque pendant le passage de main",()=>{
  const state=fresh(),snapshot=JSON.stringify(state),next=attack(state,0,"physical");
  assert.equal(next.turn,1);assert.equal(next.phase,"handoff");assert.equal(attack(next,1,"physical"),next);assert.equal(beginTurn(next,0),next);assert.equal(JSON.stringify(state),snapshot);
  const playing=beginTurn(next,1);assert.equal(attack(playing,0,"physical"),playing);
});
test("K.O. : pas de PV négatifs, remplacement automatique, victoire au cinquième",()=>{
  let state=fresh();state.teams[1][0].hp=1;state=attack(state,0,"physical");assert.equal(state.teams[1][0].hp,0);assert.equal(state.active[1],1);assert.equal(state.winner,null);
  state=fresh();state.teams[1].forEach(card=>card.hp=0);state.teams[1][0].hp=1;
  const won=attack(state,0,"physical");assert.equal(won.phase,"over");assert.equal(won.winner,0);assert.equal(attack(won,0,"physical"),won);assert.equal(defend(won,0),won);
});
test("le robot respecte la charge et adapte ses choix",()=>{
  let state=fresh();assert.equal(chooseBotAction(state,"easy"),null);state.turn=1;
  assert.equal(chooseBotAction(state,"easy",()=>0).kind,"physical");
  state.teams[1][0].charge=3;assert.equal(chooseBotAction(state,"easy",()=>0).kind,"special");
  state.teams[1][1].hp=0;assert.notEqual(chooseBotAction(state,"hard").index,1);
  state.teams[1][0].charge=0;const action=chooseBotAction(state,"medium");assert.equal(action.kind,"physical");
});
test("une partie entière avec charge finit et respecte les bornes des PV",()=>{
  let state=fresh(),actions=0;
  while(state.phase!=="over"&&actions<400){if(state.phase==="handoff")state=beginTurn(state,state.turn);const active=state.teams[state.turn][state.active[state.turn]];state=attack(state,state.turn,canSpecial(active)?"special":"physical");actions++;assert.ok(state.teams.flat().every(card=>card.hp>=0&&card.hp<=card.maxHp&&card.charge<=3));}
  assert.equal(state.phase,"over");assert.ok(actions<400);
});

// Every species, including unusual single and dual types, gets the same four action slots.
test("quatre attaques par Pokémon, techniques bloquées par leur coût et immunité contournable",()=>{
  const card={types:["fire","flying"],charge:0,stats:{attack:60,"special-attack":80}};
  assert.equal(movesFor(card).length,4);assert.equal(new Set(movesFor(card).map(move=>move.id)).size,4);assert.deepEqual(availableMoves(card).map(move=>move.id),["physical","typed"]);
  assert.deepEqual(availableMoves({...card,charge:2}).map(move=>move.id),["physical","typed","technique"]);
  assert.equal(availableMoves({...card,charge:3}).length,4);
  const ghost={types:["ghost"],stats:{defense:30,"special-defense":30}};assert.equal(damageFor(card,ghost,"physical"),0);assert.ok(damageFor(card,ghost,"typed")>0);
});

test("Vague demande deux charges, consomme deux et passe le tour sans mutation",()=>{
  let state=fresh();assert.equal(attack(state,0,"technique"),state);
  state.teams[0][0].charge=1;assert.equal(attack(state,0,"technique"),state);
  state.teams[0][0].charge=3;const snapshot=JSON.stringify(state);const next=attack(state,0,"technique");
  assert.equal(next.teams[0][0].charge,1);assert.equal(next.turn,1);assert.equal(next.phase,"handoff");assert.ok(next.teams[1][0].hp<state.teams[1][0].hp);assert.equal(JSON.stringify(state),snapshot);assert.match(next.log.at(-1),/Vague/);
});
test("tous les types ont quatre techniques, le robot choisit seulement une attaque disponible",()=>{
  for(const type of ["normal","fire","water","electric","grass","ice","fighting","poison","ground","flying","psychic","bug","rock","ghost","dragon","dark","steel","fairy"]){
    for(const charge of [0,1,2,3]){
      let state=fresh();state.turn=1;state.teams[1][0].types=[type];state.teams[1][0].charge=charge;
      for(const difficulty of ["easy","medium","hard"]){const action=chooseBotAction(state,difficulty,()=>.9);assert.ok(action.kind==="guard" || availableMoves(state.teams[1][action.index]).some(move=>move.id===action.kind));}
    }
  }
});

test("combat contre un dresseur niveau 15 : statistiques appliquées, pas seulement une étiquette",()=>{
  assert.equal(MAX_BATTLE_LEVEL,100);
  const state=createBattle(Array.from({length:10},(_,i)=>pokemon(i+1)),{levels:[1,1,1,1,1,15,15,15,15,15]});
  assert.ok(state.teams[0].every(card=>card.level===1&&card.maxHp===300));
  assert.ok(state.teams[1].every(card=>card.level===15&&card.maxHp===720&&card.stats.attack===96));
  assert.throws(()=>createCard(pokemon(1),101));assert.throws(()=>createCard(pokemon(1),0));
});


test("un dresseur de niveau 100 applique bien ses statistiques aux cinq adversaires",()=>{
 const cards=Array.from({length:10},(_,index)=>({id:index+1,name:`pokemon-${index+1}`,sprites:{},types:[{type:{name:"normal"}}],stats:Object.entries({hp:100,attack:100,defense:100,"special-attack":100,"special-defense":100,speed:100}).map(([name,base_stat])=>({stat:{name},base_stat}))}));
 const state=createBattle(cards,{levels:[1,1,1,1,1,100,100,100,100,100]});
 assert.ok(state.teams[1].every(card=>card.level===100&&card.stats.attack===1090&&card.maxHp===3270));
 assert.ok(state.teams[0].every(card=>card.level===1&&card.maxHp===300));
});
