import { pokemonName } from "./pokemon-names.js";
import { Subject, catchError, concat, fromEvent, map, merge, of, startWith, switchMap, tap, timer } from "rxjs";
import { getPokemon$ } from "./pokemon.js";
import { initCampaign } from "./campaign.js";
import { initBattle } from "./battle.js";
import { initCatalogue } from "./catalogue.js";
import "../css/style.css";
import "../css/odyssee.css";
import "../css/boosters.css";

const battleSubscription = initBattle();
const campaignSubscription = initCampaign();

const input = document.querySelector("#search");
const form = document.querySelector("#search-form");
const status = document.querySelector("#status");
const card = document.querySelector("#pokemon-card");
const cardActions = document.querySelector("#card-actions");
const backButton = document.querySelector("#back-to-catalogue");
let currentPokemonName = "";
const image = document.querySelector("#pokemon-image");
const imageFallback = document.querySelector("#image-fallback");
const numberFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const typeNames = {
  normal: "Normal", fire: "Feu", water: "Eau", electric: "Électrik", grass: "Plante",
  ice: "Glace", fighting: "Combat", poison: "Poison", ground: "Sol", flying: "Vol",
  psychic: "Psy", bug: "Insecte", rock: "Roche", ghost: "Spectre", dragon: "Dragon",
  dark: "Ténèbres", steel: "Acier", fairy: "Fée", stellar: "Stellaire"
};
const statNames = {
  hp: "PV", attack: "Attaque", defense: "Défense", "special-attack": "Att. spéciale",
  "special-defense": "Déf. spéciale", speed: "Vitesse"
};

const selection$ = new Subject();
const catalogueSubscription = initCatalogue((name) => {
  input.value = pokemonName(name);
  selection$.next({ query: name, delay: 0 });
  status.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "start"
  });
});

const input$ = fromEvent(input, "input").pipe(map(() => ({ query: input.value, delay: 450 })));
const submit$ = fromEvent(form, "submit").pipe(
  tap((event) => event.preventDefault()),
  map(() => ({ query: input.value, delay: 0 }))
);
const examples$ = merge(...Array.from(document.querySelectorAll("[data-query]"), (button) =>
  fromEvent(button, "click").pipe(
    tap(() => { input.value = button.dataset.query; }),
    map(() => ({ query: button.dataset.query, delay: 0 }))
  )
));

// Une nouvelle saisie annule immédiatement l'ancienne recherche.
// La temporisation limite les requêtes pendant que l'utilisateur écrit.
const state$ = merge(input$, submit$, examples$, selection$).pipe(
  startWith({ query: input.value, delay: 0 }),
  map(({ query, delay }) => ({ query: query.trim().toLowerCase(), delay })),
  switchMap(({ query, delay }) => {
    if (!query) return of({ kind: "idle" });
    return concat(
      of({ kind: "loading", query }),
      timer(delay).pipe(
        switchMap(() => getPokemon$(query)),
        map((pokemon) => ({ kind: "success", pokemon })),
        // Placé dans switchMap pour pouvoir rechercher à nouveau après une erreur.
        catchError((error) => of({ kind: "error", message: error.status === 422
          ? error.message
          : error.status === 404
          ? "Aucun Pokémon trouvé. Entre le nom français d’un Pokémon de la première génération ou un numéro de 1 à 151."
          : "La recherche a échoué. Vérifie ta connexion puis clique sur Rechercher pour réessayer." }))
      )
    );
  })
);

function renderPokemon(pokemon) {
  currentPokemonName = pokemon.name;
  document.querySelector("#pokemon-number").textContent = `N° ${String(pokemon.id).padStart(4, "0")}`;
  document.querySelector("#pokemon-name").textContent = pokemonName(pokemon);
  document.querySelector("#pokemon-height").textContent = `${numberFormat.format(pokemon.height / 10)} m`;
  document.querySelector("#pokemon-weight").textContent = `${numberFormat.format(pokemon.weight / 10)} kg`;

  const badges = pokemon.types.map(({ type }) => {
    const badge = document.createElement("span");
    badge.className = "type-badge";
    badge.textContent = typeNames[type.name] ?? type.name;
    return badge;
  });
  document.querySelector("#pokemon-types").replaceChildren(...badges);

  const stats = pokemon.stats.map(({ base_stat, stat }) => {
    const row = document.createElement("li");
    const label = document.createElement("span");
    const value = document.createElement("span");
    const bar = document.createElement("meter");
    label.textContent = statNames[stat.name] ?? stat.name;
    value.textContent = String(base_stat);
    bar.min = 0;
    bar.max = 255;
    bar.value = base_stat;
    bar.setAttribute("aria-label", label.textContent);
    row.append(label, value, bar);
    return row;
  });
  document.querySelector("#pokemon-stats").replaceChildren(...stats);

  const sprite = pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default;
  image.alt = `Illustration de ${pokemonName(pokemon)}`;
  image.hidden = !sprite;
  imageFallback.hidden = Boolean(sprite);
  if (sprite) image.src = sprite;
  else image.removeAttribute("src");
}

const imageSubscription = fromEvent(image, "error").subscribe(() => {
  image.hidden = true;
  imageFallback.hidden = false;
});

const subscription = state$.subscribe((state) => {
  card.hidden = state.kind !== "success";
  cardActions.hidden = state.kind !== "success";
  status.classList.toggle("is-error", state.kind === "error");
  status.classList.toggle("is-loading", state.kind === "loading");
  if (state.kind === "idle") status.textContent = "Choisis un Pokémon de la première génération ou recherche un numéro de 1 à 151.";
  if (state.kind === "loading") status.textContent = `Recherche de « ${state.query} »…`;
  if (state.kind === "error") status.textContent = state.message;
  if (state.kind === "success") {
    renderPokemon(state.pokemon);
    status.textContent = `Fiche de ${pokemonName(state.pokemon)} chargée.`;
  }
});

const backSubscription = fromEvent(backButton, "click").subscribe(() => {
  const selectedTile = Array.from(document.querySelectorAll("#pokemon-grid [data-pokemon]"))
    .find((button) => button.dataset.pokemon === currentPokemonName);
  const target = selectedTile ?? document.querySelector("#catalogue-title");
  input.value = "";
  selection$.next({ query: "", delay: 0 });
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    block: "center"
  });
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    campaignSubscription.unsubscribe();
    battleSubscription.unsubscribe();
    backSubscription.unsubscribe();
    subscription.unsubscribe();
    catalogueSubscription.unsubscribe();
    selection$.complete();
    imageSubscription.unsubscribe();
  });
}
