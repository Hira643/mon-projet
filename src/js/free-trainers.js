import { characterReward } from "./characters.js";
import { FREE_TRAINERS, FREE_TRAINER_TIERS, DIFFICULTIES, freeTrainerReward } from "./progression-model.js";

const ranks = [
  { id:"novice",label:"Novice",min:1,max:3,hue:138,step:10,icon:'<path d="M12 21V10m0 6C4 17 3 10 4 5c6-1 10 2 8 8m0 3c7 1 10-5 8-10-5 0-8 3-8 7"/>' },
  { id:"adept",label:"Confirmé",min:4,max:6,hue:192,step:12,icon:'<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6l8-4Z"/><path d="m8 12 3 3 5-6"/>' },
  { id:"expert",label:"Expert",min:7,max:9,hue:252,step:12,icon:'<path d="m12 2 9 10-9 10L3 12 12 2Z"/><path d="m12 6 5 6-5 6-5-6 5-6Z"/>' },
  { id:"elite",label:"Élite",min:10,max:12,hue:326,step:10,icon:'<path d="M13 2c2 6-4 7-2 11 2-1 3-3 3-5 5 3 7 7 4 11-3 4-10 4-13-1-2-4 0-8 3-10-1 4 1 4 2 5-1-6 4-6 3-11Z"/>' },
  { id:"master",label:"Maître",min:13,max:14,hue:36,step:9,icon:'<path d="m12 3 2.5 5 5.5.8-4 3.9.9 5.5-4.9-2.6-4.9 2.6.9-5.5-4-3.9L9.5 8 12 3Z"/><path d="M3 13c-2 5 2 9 6 9m12-9c2 5-2 9-6 9"/>' },
  { id:"legend",label:"Légendaire",min:15,max:15,hue:44,step:0,icon:'<path d="m3 6 4 5 5-8 5 8 4-5-2 13H5L3 6Z"/><path d="M5 16h14m-7-6v4m-2-2h4"/>' }
];
const crown = ranks.at(-1).icon;
ranks.push(
 {id:"champion",label:"Champion",min:20,max:35,hue:205,step:1,icon:crown},
 {id:"grandmaster",label:"Grand maître",min:40,max:55,hue:265,step:1,icon:crown},
 {id:"sovereign",label:"Souverain",min:60,max:75,hue:320,step:1,icon:crown},
 {id:"immortal",label:"Immortel",min:80,max:95,hue:28,step:.7,icon:crown},
 {id:"supreme",label:"Suprême",min:100,max:100,hue:45,step:0,icon:crown}
);
const rankOf = level => ranks.find(rank => level <= rank.max);
const icon = rank => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${rank.icon}</svg>`;
const themeStyle = (rank,level=rank.min) => `--prestige-hue:${rank.hue+(level-rank.min)*rank.step}`;

export function freeTrainersMarkup(profile,enabled) {
  const legend = `<div class="prestige-guide"><p class="prestige-guide-title">DU PREMIER DUEL À LA LÉGENDE <span>Plus le niveau monte, plus le prestige brille.</span></p><div class="prestige-scale">${ranks.map(rank => `<span class="prestige-scale-step prestige-${rank.id}" style="${themeStyle(rank)}"><span class="prestige-scale-icon">${icon(rank)}</span><span><strong>${rank.label}</strong><small>Niv. ${rank.min}${rank.max === rank.min ? "" : `–${rank.max}`}</small></span></span>`).join("")}</div></div>`;
  return legend + `<nav class="free-level-navigation prestige-navigation" aria-label="Choisir un niveau de dresseurs">${FREE_TRAINER_TIERS.map(level=>{
    const rank=rankOf(level);
    return `<button type="button" class="prestige-${rank.id}" style="${themeStyle(rank,level)}" data-campaign-action="free-level" data-level="${level}" aria-label="Voir les dresseurs de niveau ${level}"><span aria-hidden="true">${level===100 ? "♛" : "◆"}</span> Niv. ${level}</button>`;
  }).join("")}</nav>` + FREE_TRAINER_TIERS.map(level => {
    const trainers=FREE_TRAINERS.filter(trainer=>trainer.level===level), rank=rankOf(level);
    const difficulty=trainers[0].difficulty, info=DIFFICULTIES[difficulty], reward=characterReward(freeTrainerReward(level),profile.characterId);
    return `<section id="free-level-group-${level}" class="trainer-group free-level-group prestige-group prestige-${rank.id}" style="${themeStyle(rank,level)}" aria-labelledby="free-level-title-${level}"><div class="trainer-group-heading prestige-group-heading"><div class="prestige-level-identity"><span class="prestige-emblem">${icon(rank)}</span><div><p class="prestige-kicker">${rank.label} <span>· ${info.label}</span></p><h3 id="free-level-title-${level}">Niveau ${level} <small>· ${trainers.length} dresseurs</small></h3></div></div><p class="prestige-group-reward"><strong>${reward.coins} or <span>+ ${reward.xp} XP</span></strong><small>À CHAQUE VICTOIRE</small></p></div><div class="trainer-grid free-trainer-grid">${trainers.map(trainer=>{
      const won=profile.freeDefeatedTrainers.includes(trainer.id);
      return `<article class="trainer-card difficulty-${difficulty} prestige-card"><div class="trainer-card-top"><span class="trainer-number">N° ${String(FREE_TRAINERS.indexOf(trainer)+1).padStart(2,"0")}</span><span class="difficulty-badge">Niv. ${trainer.level}</span></div><span class="prestige-card-label">${icon(rank)} ${rank.label}</span><div class="prestige-portrait-wrap"><span class="trainer-avatar trainer-portrait" style="background-position:${trainer.portraitIndex%5*25}% ${Math.floor(trainer.portraitIndex/5)*50}%" role="img" aria-label="Portrait de ${trainer.name}"></span><span class="prestige-portrait-seal">${icon(rank)}</span></div><h4>${trainer.name}</h4><p>${trainer.title}</p><span class="trainer-reward"><span><i aria-hidden="true">◈</i> ${reward.coins} or</span><span><i aria-hidden="true">✦</i> ${reward.xp} XP</span></span><span class="trainer-completed">${won ? "✓ Vaincu · Rejouable" : "5 Pokémon à affronter"}</span><button type="button" data-campaign-action="fight" data-trainer="${trainer.id}" ${!enabled ? "disabled" : ""}>${won ? "Réaffronter" : "Affronter"} ${trainer.name}<span aria-hidden="true">→</span></button></article>`;
    }).join("")}</div></section>`;
  }).join("");
}
