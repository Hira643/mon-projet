import { availableMoves, damageFor } from "./battle-model.js";
export function chooseBotAction(state,difficulty,random = Math.random) {
  if (state.phase !== "playing" || state.turn !== 1) return null;
  const target = state.teams[0][state.active[0]], currentIndex = state.active[1];
  if (difficulty === "easy") {
    const card = state.teams[1][currentIndex];
    const moves = availableMoves(card);
    if (card.charge >= 3 && random() < .7) return { index:currentIndex,kind:"special" };
    return { index:currentIndex,kind:moves[Math.min(moves.length-1,Math.floor(random()*moves.length))].id };
  }
  const choices = state.teams[1].flatMap((card,index) => {
    if (card.hp <= 0) return [];
    const incoming = Math.max(...availableMoves(target).map(move => damageFor(target,card,move.id)),1);
    const kinds = availableMoves(card).map(move => move.id);
    const actions = kinds.map((kind) => {
      const damage = damageFor(card,target,kind);
      const score = difficulty === "hard" ? (damage >= target.hp ? 10000 : 0) + Math.min(5,card.hp/incoming) / Math.max(1,Math.ceil(target.hp/Math.max(1,damage))) * 100 + damage/100 : damage;
      return { index,kind,score };
    });
    if (difficulty === "hard" && !card.guard && card.hp <= incoming && card.hp > incoming/2 && card.charge === 2) actions.push({ index,kind:"guard",score: 9999 });
    return actions;
  });
  return choices.sort((a,b) => b.score-a.score)[0] ?? { index: currentIndex,kind:"physical" };
}
