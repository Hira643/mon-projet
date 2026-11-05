import { pokemonXpMarkup, knockoutExperience } from "./pokemon-levels.js";
import { getCharacter } from "./characters.js";
import { characterPortraitStyle } from "./character-ui.js";
import { Subject, Subscription, catchError, from, fromEvent, map, merge, mergeMap, of, scan, startWith, switchMap, toArray } from "rxjs";
import { getPokemon$ } from "./pokemon.js";
import { attack, beginTurn, canSpecial, createBattle, damageDetails, damageFor, defend, drawPokemonIds, selectPokemon, movesFor, SPECIAL_CHARGE } from "./battle-model.js";
import "../css/battle.css";

const types = { normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik", grass: "Plante", ice: "Glace", fighting: "Combat", poison: "Poison", ground: "Sol", flying: "Vol", psychic: "Psy", bug: "Insecte", rock: "Roche", ghost: "Spectre", dragon: "Dragon", dark: "Ténèbres", steel: "Acier", fairy: "Fée" };
const statLabels = [["attack", "Attaque"], ["defense", "Défense"], ["special-attack", "Att. spé."], ["special-defense", "Déf. spé."], ["speed", "Vitesse"]];
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const displayName = (name) => name.replaceAll("-", " ");

function reducer(state, action) {
  if (action.type === "loading") return { phase: "loading" };
  if (action.type === "ready") return createBattle(action.pokemon);
  if (action.type === "error") return { phase: "error" };
  if (action.type === "select") return selectPokemon(state, action.player, action.index);
  if (action.type === "guard") return defend(state, action.player);
  if (action.type === "attack") return attack(state, action.player, action.kind);
  if (action.type === "begin") return beginTurn(state, action.player);
  return state;
}

export function playerMarkup(state, player, options = {}) {
  const playerLabel = options.label ?? `Joueur ${player+1}`;
  const titleId = `${options.idPrefix ?? "local"}-player-${player+1}-title`;
  const team = state.teams[player], active = team[state.active[player]], target = state.teams[1-player][state.active[1-player]];
  const canPlay = state.phase === "playing" && state.turn === player && options.controlled !== false;
  const ready = canSpecial(active);
  const effectiveness = (details) => details.multiplier === 0 ? "Immunité adverse" : details.multiplier > 1 ? `Super efficace ×${details.multiplier}` : details.multiplier < 1 ? `Résisté ×${details.multiplier}` : "Efficacité normale";
  const remaining = team.filter((card) => card.hp > 0).length;
  const hit = state.lastEvent?.target === player && !state.lastEvent.knockedOut;
  const character=getCharacter(active.characterId);
  const portrait = character ? `<span class="character-portrait battle-trainer-avatar" style="${characterPortraitStyle(character)}" role="img" aria-label="Portrait de ${character.name}"></span>` : options.portraitIndex !== undefined ? `<span class="trainer-portrait battle-trainer-avatar" style="background-position:${(options.portraitIndex%5)*25}% ${Math.floor((options.portraitIndex%15)/5)*50}%" role="img" aria-label="Portrait de ${escape(playerLabel)}"></span>` : '<span class="player-dot" aria-hidden="true"></span>';
  const picture = active.image ? `<img class="fighter-image" src="${escape(active.image)}" alt="${escape(active.name)}" width="190" height="190">` : '<span class="fighter-missing">Illustration indisponible</span>';
  const badges = active.types.map((type) => `<span class="type-badge">${escape(types[type] ?? type)}</span>`).join("");
  const stats = statLabels.map(([key,label]) => `<div><dt>${label}</dt><dd>${active.stats[key]}</dd></div>`).join("");
  const cards = team.map((card,index) => `<li><button type="button" class="hand-card${index === state.active[player] ? " is-active" : ""}${card.hp === 0 ? " is-ko" : ""}" data-action="select" data-player="${player}" data-index="${index}" data-focus-key="card-${player}-${index}" aria-label="${escape(playerLabel)} : choisir ${escape(card.name)}, ${card.hp} PV sur ${card.maxHp}" aria-pressed="${index === state.active[player]}" ${!canPlay || card.hp === 0 ? "disabled" : ""}><span class="hand-number">#${String(card.id).padStart(3,"0")} · N${card.level}</span>${card.image ? `<img src="${escape(card.image)}" alt="" width="64" height="64">` : '<span class="hand-no-image">?</span>'}<span class="hand-name">${escape(displayName(card.name))}</span><span class="hand-hp">${card.hp === 0 ? "K.O." : `${card.hp}/${card.maxHp} PV`}</span><span class="hand-charge">⚡ ${card.charge}/${SPECIAL_CHARGE}</span>${card.xp === undefined ? "" : pokemonXpMarkup(card.xp,displayName(card.name),true)}</button></li>`).join("");
  return `<section class="player-board player-${player+1}${canPlay ? " current-player" : ""}${hit ? " battle-hit" : ""}" aria-labelledby="${titleId}">
    <header class="player-header"><h3 id="${titleId}">${portrait}${escape(playerLabel)}</h3><span>${remaining}/5 en jeu</span></header>
    ${character ? `<p class="fighter-character-note"><strong>${character.name}</strong> · ${character.bonus}</p>` : ""}
    <div class="fighter-portrait">${picture}<span class="fighter-id">N° ${String(active.id).padStart(3,"0")}</span>${hit ? `<span class="damage-pop">${state.lastEvent.damageApplied > 0 ? `−${state.lastEvent.damageApplied} PV` : "Immunité"}</span>` : ""}${active.guard ? '<span class="guard-badge">Protégé · −50 %</span>' : ""}</div>
    <div class="fighter-heading"><h4>${escape(displayName(active.name))} <small class="fighter-level">Niv. ${active.level}</small></h4><div class="types">${badges}</div></div>
    <div class="health-heading"><span>PV <span class="hp-multiplier">×3</span></span><strong>${active.hp} <span>/ ${active.maxHp}</span></strong></div>
    <progress class="health-bar" value="${active.hp}" max="${active.maxHp}" aria-label="PV du Pokémon actif du joueur ${player+1}">${active.hp}/${active.maxHp}</progress>
    ${active.xp === undefined ? "" : pokemonXpMarkup(active.xp,displayName(active.name))}
    ${options.showXpReward ? `<p class="fighter-xp-reward">Récompense si K.O. : <strong>+${knockoutExperience(active)} XP</strong></p>` : ""}
    <div class="special-charge${ready ? " is-ready" : ""}"><div><span>ÉNERGIE SPÉCIALE</span><strong>${ready ? "PRÊTE !" : `${active.charge}/${SPECIAL_CHARGE}`}</strong></div><progress value="${active.charge}" max="${SPECIAL_CHARGE}" aria-label="Charge spéciale de ${escape(active.name)}">${active.charge}/${SPECIAL_CHARGE}</progress></div>
    <dl class="fighter-stats">${stats}</dl>
    <div class="attack-actions">
      ${movesFor(active).map((move,index) => {
        const details = damageDetails(active,target,move.id), charged = active.charge >= move.cost;
        return `<button type="button" class="attack-button move-${index}${move.cost ? " secondary" : ""}${charged && move.cost ? " special-ready" : ""}" data-action="attack" data-kind="${move.id}" data-player="${player}" data-focus-key="attack-${player}-${move.id}" ${!canPlay || !charged ? "disabled" : ""}><span><b>${index+1}</b> ${escape(move.name)}</span><strong>${details.damage} dégâts <em>${escape(types[details.type] ?? details.type)}</em></strong><small>${move.cost ? `⚡ ${move.cost} charges${charged ? " · Prête" : ` · ${active.charge}/${move.cost}`}` : "+1 charge"} · ${effectiveness(details)}</small></button>`;
      }).join("")}
      <button type="button" class="guard-button" data-action="guard" data-player="${player}" data-focus-key="guard-${player}" ${!canPlay ? "disabled" : ""}>Se protéger <span>−50 % sur la prochaine attaque · +1 charge</span></button>
    </div>
    <p class="hand-caption">TES 5 CARTES <span>${canPlay ? "Choisis ton Pokémon" : options.controlled === false ? "Équipe du dresseur" : "En attente de ton tour"}</span></p><ul class="pokemon-hand" aria-label="Cartes de ${escape(playerLabel)}">${cards}</ul>
  </section>`;
}

export function initBattle() {
  const actions$ = new Subject();
  const subscriptions = new Subscription();
  const arena = document.querySelector("#battle-arena");
  const empty = document.querySelector("#battle-empty");
  const startButton = document.querySelector("#new-battle");
  const replayButton = document.querySelector("#replay-battle");
  const status = document.querySelector("#battle-status");
  const handoff = document.querySelector("#battle-handoff");
  const log = document.querySelector("#battle-log");
  const logBox = document.querySelector("#battle-log-box");
  const turnBadge = document.querySelector("#battle-turn-badge");
  let currentTurn = 0;

  const state$ = actions$.pipe(scan(reducer, { phase: "idle" }), startWith({ phase: "idle" }));
  subscriptions.add(state$.subscribe((state) => {
    const active = Boolean(state.teams);
    const focusKey = document.activeElement?.dataset.focusKey;
    startButton.disabled = state.phase === "loading";
    replayButton.hidden = state.phase !== "over";
    startButton.textContent = state.phase === "loading" ? "Distribution…" : active ? "Nouvelle distribution ↻" : state.phase === "error" ? "Réessayer la distribution" : "Distribuer les cartes ↗";
    empty.hidden = active;
    arena.hidden = !active;
    logBox.hidden = !active;
    handoff.hidden = state.phase !== "handoff";
    status.classList.toggle("is-error", state.phase === "error");
    status.classList.toggle("is-loading", state.phase === "loading");
    if (!active) {
      arena.replaceChildren();
      log.replaceChildren();
      turnBadge.textContent = "5 VS 5";
      status.textContent = state.phase === "loading" ? "Tirage au hasard et chargement des 10 cartes depuis PokéAPI…" : state.phase === "error" ? "La distribution a échoué. Vérifie ta connexion et réessaie." : "Prêts ? Distribue les cartes pour commencer une partie.";
      return;
    }
    currentTurn = state.turn;
    turnBadge.textContent = state.phase === "over" ? "PARTIE TERMINÉE" : `TOUR ${state.turnNumber}`;
    status.textContent = state.phase === "over" ? `Victoire du joueur ${state.winner + 1} ! Les 5 Pokémon adverses sont K.O.` : state.phase === "handoff" ? `Au tour du joueur ${state.turn + 1}. Passe-lui la main pour continuer.` : `Joueur ${state.turn + 1}, à toi ! Choisis un Pokémon puis attaque ton adversaire.`;
    handoff.textContent = `Joueur ${state.turn + 1}, commencer mon tour →`;
    arena.innerHTML = playerMarkup(state, 0) + '<span class="arena-vs" aria-hidden="true">VS</span>' + playerMarkup(state, 1);
    const lines = state.log.map((message) => {
      const item = document.createElement("li");
      item.textContent = message;
      return item;
    });
    log.replaceChildren(...lines.reverse());
    if (state.phase === "handoff") handoff.focus({ preventScroll: true });
    if (state.phase === "over") replayButton.focus({ preventScroll: true });
    if (focusKey) {
      const target = Array.from(arena.querySelectorAll("[data-focus-key]")).find((element) => element.dataset.focusKey === focusKey && !element.disabled);
      target?.focus({ preventScroll: true });
    }
  }));

  subscriptions.add(merge(fromEvent(startButton, "click"), fromEvent(replayButton, "click")).pipe(
    switchMap(() => from(drawPokemonIds()).pipe(
      mergeMap((id, index) => getPokemon$(String(id)).pipe(map((pokemon) => ({ pokemon, index }))), 4),
      toArray(),
      map((cards) => ({ type: "ready", pokemon: cards.sort((a, b) => a.index - b.index).map(({ pokemon }) => pokemon) })),
      startWith({ type: "loading" }),
      catchError(() => of({ type: "error" }))
    ))
  ).subscribe((action) => actions$.next(action)));

  subscriptions.add(fromEvent(arena, "click").subscribe((event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || !arena.contains(button)) return;
    actions$.next({ type: button.dataset.action, player: Number(button.dataset.player), index: Number(button.dataset.index), kind: button.dataset.kind });
  }));
  subscriptions.add(fromEvent(handoff, "click").subscribe(() => {
    actions$.next({ type: "begin", player: currentTurn });
    arena.querySelector(".current-player")?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"
    });
  }));
  subscriptions.add(fromEvent(arena, "error", { capture: true }).subscribe((event) => {
    if (event.target instanceof HTMLImageElement) {
      event.target.alt = "Illustration indisponible";
      event.target.classList.add("image-unavailable");
    }
  }));

  subscriptions.add(() => actions$.complete());
  return subscriptions;
}
