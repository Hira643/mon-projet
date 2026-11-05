import { pokemonApiQuery } from "./pokemon-names.js";
import { defer, map, of, tap, timeout } from "rxjs";
import { fromFetch } from "rxjs/fetch";

const cache = new Map();
const GENERATION_ONE_COUNT = 151;
const API_URL = "https://pokeapi.co/api/v2/pokemon/";

function getJson$(url) {
  return defer(() => {
    if (cache.has(url)) return of(cache.get(url));
    return fromFetch(url, {
      selector: async (response) => {
        if (!response.ok) {
          const error = new Error("Impossible de récupérer les données de PokéAPI.");
          error.status = response.status;
          throw error;
        }
        return response.json();
      }
    }).pipe(
      timeout(12000),
      tap((data) => {
        if (cache.size >= 160) cache.delete(cache.keys().next().value);
        cache.set(url, data);
      })
    );
  });
}

export function getPokemon$(query) {
  return getJson$(`${API_URL}${encodeURIComponent(pokemonApiQuery(query))}/`).pipe(
    map((pokemon) => {
      if (pokemon.id < 1 || pokemon.id > GENERATION_ONE_COUNT) {
        const error = new Error("Ce Pokémon ne fait pas partie de la première génération (n° 1 à 151).");
        error.status = 422;
        throw error;
      }
      return pokemon;
    })
  );
}

export function getPokemonPage$(offset = 0, limit = 24) {
  // L'API fournit les 151 premières fiches ; la pagination reste dans ce groupe.
  // La liste est mise en cache, puis découpée en pages sans dépasser Mew.
  return getJson$(`${API_URL}?limit=${GENERATION_ONE_COUNT}&offset=0`).pipe(
    map(({ results }) => ({
      count: results.length,
      previous: offset > 0,
      next: offset + limit < results.length,
      results: results.slice(offset, offset + limit)
    }))
  );
}
