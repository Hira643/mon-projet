import { pokemonName } from "./pokemon-names.js";
import { getCharacter } from "./characters.js";
import { createCard, movesFor, defensiveMatchups, damageFor, TYPE_LABELS } from "./battle-model.js";
import { MAX_LEVEL } from "./progression-model.js";
import { pokemonXpMarkup, pokemonXpProgress } from "./pokemon-levels.js";
const escape = (value) => String(value).replace(/[&<>"']/g,(character) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[character]);
const labels = { hp:"PV",attack:"Attaque",defense:"Défense","special-attack":"Attaque spéciale","special-defense":"Défense spéciale",speed:"Vitesse" };
export function cardInfoMarkup(pokemon,owned,coins,characterId=null) {
  const current = createCard(pokemon,owned.level,characterId), maxed = owned.level >= MAX_LEVEL;
  const next = maxed ? current : createCard(pokemon,owned.level+1,characterId);
  const dummy = { types:[],stats:{ defense:60,"special-defense":60 } };
  const progress = pokemonXpProgress(owned.xp);
  const rows = Object.entries(labels).map(([key,label]) => {
    const before = key === "hp" ? current.maxHp : current.stats[key], after = key === "hp" ? next.maxHp : next.stats[key];
    return `<tr><th scope="row">${label}</th><td>${before}</td><td>${maxed ? "—" : `${after} <strong>+${after-before}</strong>`}</td></tr>`;
  }).join("");
  const matchups = defensiveMatchups(current);
  const chips = (entries) => entries.map(({ type,multiplier }) => `<span>${escape(TYPE_LABELS[type] ?? type)} ×${multiplier}</span>`).join("") || '<span>Aucune</span>';
  return `<div class="card-info-heading">${current.image ? `<img src="${escape(current.image)}" alt="" width="120" height="120">` : ""}<div><p class="eyebrow">CAPACITÉS & PROGRESSION</p><h2 id="card-info-title">${escape(pokemonName(pokemon))}</h2><p>Niveau ${owned.level} / 100 · +${(owned.level-1)*10} % de statistiques</p></div></div>
    ${pokemonXpMarkup(owned.xp,pokemonName(pokemon))}
    ${getCharacter(characterId) ? `<p class="card-character-note">Bonus de ${getCharacter(characterId).name} inclus dans les PV et les dégâts affichés : ${getCharacter(characterId).bonus}.</p>` : ""}
    <section class="card-capabilities"><h3>Ses 4 attaques</h3>${movesFor(current).map((move,index) => `<p><strong>${index+1}. ${escape(move.name)} :</strong> ${move.category === "special" ? "spéciale" : "physique"} · ${move.types.map(type => TYPE_LABELS[type]).join(" / ")} · puissance ×${move.power} · ${move.cost ? `${move.cost} charges consommées` : "libre, +1 charge"}.</p>`).join("")}<p><strong>Protection :</strong> réduit de moitié la prochaine attaque reçue et ajoute 1 charge. Chaque attaque ou protection consomme le tour. Changer de Pokémon conserve sa charge.</p></section>
    <div class="matchups"><section><h3>Faiblesses</h3><div class="weaknesses">${chips(matchups.filter((item) => item.multiplier > 1))}</div></section><section><h3>Résistances & immunités</h3><div class="resistances">${chips(matchups.filter((item) => item.multiplier < 1))}</div></section></div>
    <h3>${maxed ? "Statistiques au niveau maximum" : `Gains au niveau ${owned.level+1}`}</h3><table class="upgrade-preview"><thead><tr><th>Statistique</th><th>Actuel</th><th>Niveau suivant</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="damage-preview"><h3>Gain de dégâts estimé</h3><p>Comparaison contre une cible neutre avec 60 de défense et de défense spéciale, sans protection.</p>${movesFor(current).map((move) => `<div><span>${escape(move.name)}</span><strong>${damageFor(current,dummy,move.id)} → ${damageFor(next,dummy,move.id)} <small>(+${damageFor(next,dummy,move.id)-damageFor(current,dummy,move.id)})</small></strong></div>`).join("")}</div>
    <div class="card-info-training"><p>${maxed ? "Niveau 100 atteint : entraînement terminé !" : `Encore ${progress.required-progress.current} XP avant le niveau ${owned.level+1}.`}</p><p>Seul le Pokémon qui met l’adversaire K.O. gagne de l’XP : plus le niveau et les statistiques de base du Pokémon vaincu sont élevés, plus la récompense est grande. Le gain exact est affiché sur sa fiche pendant le combat. Une attaque sans K.O., la protection et les changements ne rapportent aucune XP. Les gains sont sauvegardés immédiatement, même en cas de défaite ou de retour à la route.</p><p>Chaque niveau augmente de 10 % les statistiques de base : PV, attaque, défense, attaque spéciale, défense spéciale et vitesse. Les quatre attaques restent disponibles avec leurs règles de charge.</p></div>`;
}
