import { pokemonName } from "./pokemon-names.js";
import { BehaviorSubject, Subscription, catchError, concat, from, fromEvent, map, mergeMap, of, switchMap } from "rxjs";
import { getPokemon$, getPokemonPage$ } from "./pokemon.js";

const PAGE_SIZE = 24;

export function initCatalogue(onSelect) {
  const grid = document.querySelector("#pokemon-grid");
  const status = document.querySelector("#catalogue-status");
  const count = document.querySelector("#catalogue-count");
  const previous = document.querySelector("#previous-page");
  const next = document.querySelector("#next-page");
  const retry = document.querySelector("#retry-page");
  const pageLabel = document.querySelector("#page-label");
  const page$ = new BehaviorSubject(0);
  const subscriptions = new Subscription();
  const tiles = new Map();
  let currentOffset = 0;
  let total = 0;

  subscriptions.add(fromEvent(previous, "click").subscribe(() => page$.next(Math.max(0, currentOffset - PAGE_SIZE))));
  subscriptions.add(fromEvent(next, "click").subscribe(() => page$.next(currentOffset + PAGE_SIZE)));
  subscriptions.add(fromEvent(retry, "click").subscribe(() => page$.next(currentOffset)));
  subscriptions.add(fromEvent(grid, "click").subscribe((event) => {
    const button = event.target.closest("button[data-pokemon]");
    if (button && grid.contains(button)) onSelect(button.dataset.pokemon);
  }));

  subscriptions.add(page$.pipe(
    switchMap((offset) => {
      currentOffset = offset;
      return concat(
        of({ kind: "loading" }),
        getPokemonPage$(offset, PAGE_SIZE).pipe(
          switchMap((page) => concat(
            of({ kind: "page", page }),
            // Les noms sont affichés immédiatement. Quatre fiches se chargent à la fois.
            from(page.results).pipe(
              mergeMap((entry) => getPokemon$(entry.name).pipe(
                map((pokemon) => ({ kind: "pokemon", pokemon })),
                catchError(() => of({ kind: "unavailable", name: entry.name }))
              ), 4)
            )
          )),
          catchError(() => of({ kind: "error" }))
        )
      );
    })
  ).subscribe((state) => {
    if (state.kind === "loading") {
      grid.setAttribute("aria-busy", "true");
      status.textContent = "Chargement des Pokémon depuis PokéAPI…";
      status.classList.remove("is-error");
      previous.disabled = true;
      next.disabled = true;
      retry.hidden = true;
      grid.replaceChildren();
      tiles.clear();
    }
    if (state.kind === "error") {
      grid.setAttribute("aria-busy", "false");
      status.textContent = "Impossible de charger le catalogue. Vérifie ta connexion et réessaie.";
      status.classList.add("is-error");
      retry.hidden = false;
    }
    if (state.kind === "page") {
      total = state.page.count;
      count.textContent = `${total.toLocaleString("fr-FR")} Pokémon de la première génération`;
      pageLabel.textContent = `Page ${Math.floor(currentOffset / PAGE_SIZE) + 1} sur ${Math.ceil(total / PAGE_SIZE)}`;
      previous.disabled = !state.page.previous;
      next.disabled = !state.page.next;
      status.textContent = `Pokémon ${currentOffset + 1} à ${currentOffset + state.page.results.length} sur ${total.toLocaleString("fr-FR")}. Clique sur une carte pour voir sa fiche.`;
      const cards = state.page.results.map((entry) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        const number = document.createElement("span");
        const image = document.createElement("img");
        const fallback = document.createElement("span");
        const name = document.createElement("span");
        const id = new URL(entry.url).pathname.split("/").filter(Boolean).at(-1);
        button.type = "button";
        button.className = "pokemon-tile";
        button.dataset.pokemon = entry.name;
        button.setAttribute("aria-label", `Voir la fiche de ${pokemonName(entry)}`);
        number.className = "tile-number";
        number.textContent = `N° ${String(id).padStart(4, "0")}`;
        image.width = 120;
        image.height = 120;
        image.alt = "";
        image.decoding = "async";
        image.hidden = true;
        fallback.className = "tile-fallback";
        fallback.textContent = "…";
        fallback.setAttribute("aria-hidden", "true");
        name.className = "tile-name";
        name.textContent = pokemonName(entry);
        // Cet écouteur disparaît avec la carte lors du changement de page.
        image.addEventListener("error", () => {
          image.hidden = true;
          fallback.hidden = false;
          fallback.textContent = "?";
        }, { once: true });
        button.append(number, image, fallback, name);
        item.append(button);
        tiles.set(entry.name, { image, fallback });
        return item;
      });
      grid.replaceChildren(...cards);
      grid.setAttribute("aria-busy", "false");
    }
    if (state.kind === "pokemon") {
      const tile = tiles.get(state.pokemon.name);
      if (!tile) return;
      const sprite = state.pokemon.sprites.other?.["official-artwork"]?.front_default ?? state.pokemon.sprites.front_default;
      if (sprite) {
        tile.image.src = sprite;
        tile.image.hidden = false;
        tile.fallback.hidden = true;
      } else tile.fallback.textContent = "?";
    }
    if (state.kind === "unavailable") {
      const tile = tiles.get(state.name);
      if (tile) tile.fallback.textContent = "?";
    }
  }));

  subscriptions.add(() => page$.complete());
  return subscriptions;
}
