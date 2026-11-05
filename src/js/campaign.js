import { pokemonName, matchesPokemonName } from "./pokemon-names.js";
import {boosterShopMarkup} from "./booster-shop.js";
import {ITEMS,claimMission,buyItem,consumeItem,toggleFavorite,updateSettings} from "./league-model.js";
import {homeMarkup,journalMarkup,itemShopMarkup,battleBagMarkup,rarityFor} from "./league-ui.js";
import {playGameSound} from "./game-audio.js";
import { pokemonXpMarkup } from "./pokemon-levels.js";
import { EMPTY, Subject, Subscription, catchError, filter, forkJoin, fromEvent, map, mergeMap, of, switchMap, timer } from "rxjs";
import { getPokemon$ } from "./pokemon.js";
import { attack, beginTurn, createBattle, createCard, defend, selectPokemon, withPokemonExperience, useBattleItem, TYPE_LABELS } from "./battle-model.js";
import { playerMarkup } from "./battle.js";
import { chooseBotAction } from "./bot.js";
import { BOOSTER_TYPES, DIFFICULTIES, MAX_LEVEL, SAVE_KEY, claimMewGift, TRAINERS, FREE_TRAINERS, canChallengeTrainer, buyBooster, createProfile, loadProfile, openBooster, recordVictory, recordFreeVictory, recordDefeat, normalizeProfile, selectCharacter, replaceDeckCard, saveProfile, totalBoosters, recordPokemonAttack, xpProgress } from "./progression-model.js";
import { freeTrainersMarkup } from "./free-trainers.js";
import { adventureMarkup } from "./adventure-map.js";
import { getCharacter } from "./characters.js";
import { characterCardsMarkup, characterSummaryMarkup, characterPortraitStyle } from "./character-ui.js";
import { cardInfoMarkup } from "./card-info.js";
import "../css/campaign.css";
import "../css/refinement.css";
import "../css/adventure.css";
import "../css/prestige.css";
import "../css/navigation.css";
import "../css/characters.css";
import "../css/pokemon-xp.css";

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const nameOf = pokemonName;
const imageOf = (pokemon) => pokemon?.sprites?.other?.["official-artwork"]?.front_default ?? pokemon?.sprites?.front_default ?? "";

export function initCampaign() {
  const root = document.querySelector("#campaign-view");
  const subscriptions = new Subscription();
  const pokemon = new Map();
  const requested = new Set();
  const metadata$ = new Subject();
  const fights$ = new Subject();
  const bot$ = new Subject();
  let storage, profile, saveProblem = "", notice = "", panel = "home", replacement = null, lastPack = [], inspectedId = null, pendingImport = null;
  let battle = null, trainer = null, battleId = "", battleCharacterId = null, loading = false, rewardPending = false, rewarded = false, pokemonXpNotice = "", defeatRecorded = false;
  try {
    storage = window.localStorage;
    const saved = loadProfile(storage);
    const gifted = claimMewGift(saved);
    saveProfile(storage, gifted);
    profile = gifted;
    if (gifted !== saved) notice = "Cadeau reçu : 10 cartes de Mew ont été ajoutées à ta collection !";
  } catch {
    profile = createProfile();
    storage = null;
    saveProblem = "La sauvegarde locale est indisponible ou illisible. La progression ne sera pas modifiée. Autorise le stockage de ce site pour jouer avec une sauvegarde.";
  }

  let routeRegion = Math.min(9,Math.floor(profile.adventureWins/10)), rewardRolls = [];

  const arena = root.querySelector("#campaign-arena");
  const fightBox = root.querySelector("#campaign-fight");
  const fightStatus = root.querySelector("#campaign-battle-status");

  const renderedMarkup = new Map();
  function writeMarkup(selector, markup) {
    if (renderedMarkup.get(selector) === markup) return;
    root.querySelector(selector).innerHTML = markup;
    renderedMarkup.set(selector, markup);
  }

  function queuePokemon(ids) {
    for (const id of ids) if (!pokemon.has(Number(id)) && !requested.has(Number(id))) {
      requested.add(Number(id));
      metadata$.next(Number(id));
    }
  }

  function commit(change, message = "") {
    try {
      if (!storage) throw new Error(saveProblem);
      const latest = loadProfile(storage);
      const next = change(latest);
      saveProfile(storage, next);
      profile = next;
      notice = message;
      renderHub();
      queuePokemon(Object.keys(profile.collection));
      return true;
    } catch (error) {
      notice = error.message || "Impossible de sauvegarder. L’opération a été annulée.";
      renderHub();
      return false;
    }
  }

  function cardPicture(id, cssClass = "") {
    const data = pokemon.get(Number(id));
    const image = imageOf(data);
    return image ? `<img class="${cssClass}" src="${escape(image)}" alt="" width="100" height="100" loading="lazy">` : '<span class="collection-placeholder" aria-hidden="true">?</span>';
  }

  function renderHub() {
    document.querySelector("#header-gold").textContent = String(profile.coins);
    root.querySelector("#profile-coins").textContent = String(profile.coins);
    root.querySelector("#profile-boosters").textContent = String(totalBoosters(profile));
    root.querySelector("#profile-owned").textContent = `${Object.keys(profile.collection).length}/151`;
    root.querySelector("#profile-defeated").textContent = `${profile.adventureWins}/100`;
    root.dataset.panel=panel;
    root.dataset.inBattle=String(Boolean(battle||loading));
    document.documentElement.dataset.motion=profile.league.settings.motion?"on":"off";
    writeMarkup("#league-home",homeMarkup(profile,pokemon,Boolean(storage)&&!battle&&!loading));
    writeMarkup("#league-journal",journalMarkup(profile,Boolean(storage)&&!battle&&!loading));
    writeMarkup("#item-shop",itemShopMarkup(profile,Boolean(storage)));
    const soundButton=root.querySelector("#toggle-sound"),motionButton=root.querySelector("#toggle-motion");
    soundButton.setAttribute("aria-pressed",String(profile.league.settings.sound));soundButton.textContent=profile.league.settings.sound?"Son activé":"Activer le son";
    motionButton.setAttribute("aria-pressed",String(profile.league.settings.motion));motionButton.textContent=profile.league.settings.motion?"Animations activées":"Animations réduites";
    document.querySelector("#open-settings").disabled=loading||Boolean(battle&&battle.phase!=="over");

    const character=getCharacter(profile.characterId), characterLocked=loading || Boolean(battle && battle.phase!=="over");
    const avatar=root.querySelector("#profile-character-avatar");
    avatar.classList.toggle("character-portrait",Boolean(character));
    avatar.textContent=character ? "" : "TOI";
    avatar.style.cssText=character ? characterPortraitStyle(character) : "";
    root.querySelector("#profile-character-name").textContent=character ? `${character.name} · ${character.role}` : "Aucun personnage sélectionné";
    writeMarkup("#character-summary",characterSummaryMarkup(profile,characterLocked));
    writeMarkup("#character-cards",characterCardsMarkup(profile,Boolean(storage) && !characterLocked));
    root.querySelector("#clear-character").disabled=!profile.characterId || !storage || characterLocked;
    const xp = xpProgress(profile.xp);
    root.querySelector("#profile-level").textContent = `Dresseur niveau ${xp.level}`;
    root.querySelector("#profile-xp-label").textContent = `${xp.current} / ${xp.required} XP`;
    root.querySelector("#profile-xp").max = xp.required;
    root.querySelector("#profile-xp").value = xp.current;
    root.querySelector("#profile-total-xp").textContent = `${profile.xp} XP au total`;

    root.querySelector("#campaign-notice").textContent = saveProblem || notice;
    root.querySelector("#campaign-save-state").textContent = storage ? "Progression sauvegardée dans ce navigateur" : "Sauvegarde indisponible";
    root.querySelector("#campaign-panels").hidden = loading || Boolean(battle);
    const focusKey = document.activeElement?.dataset.campaignFocus;

    writeMarkup("#campaign-deck", profile.deck.map((id) => {
      const card = profile.collection[id];
      return `<li>${cardPicture(id)}<span>${escape(nameOf(pokemon.get(id), id))}</span><small>Niv. ${card.level}</small>${pokemonXpMarkup(card.xp, nameOf(pokemon.get(id), id), true)}</li>`;
    }).join(""));

    writeMarkup("#trainer-list",adventureMarkup(profile,routeRegion,Boolean(storage) && !loading));
    writeMarkup("#free-trainer-list",freeTrainersMarkup(profile,Boolean(storage) && !loading));
    root.querySelector("#free-trainer-count").textContent = `${profile.freeDefeatedTrainers.length}/${FREE_TRAINERS.length} vaincus`;

    root.querySelector("#replacement-picker").hidden = replacement === null;
    if (replacement !== null) {
      root.querySelector("#replacement-title").textContent = `Ajouter ${nameOf(pokemon.get(replacement), replacement)} : quelle carte veux-tu remplacer ?`;
      writeMarkup("#replacement-options", profile.deck.map((id) => `<button type="button" data-campaign-action="replace" data-old-id="${id}">${escape(nameOf(pokemon.get(id), id))}</button>`).join(""));
    }

    const query=root.querySelector("#collection-search").value.trim().toLowerCase(),filterMode=root.querySelector("#collection-filter").value,sort=root.querySelector("#collection-sort").value;
    const owned=Object.entries(profile.collection).filter(([key])=>{
      const id=Number(key),name=nameOf(pokemon.get(id),id).toLowerCase();
      return matchesPokemonName(query,pokemon.get(id),id)&&(filterMode!=="deck"||profile.deck.includes(id))&&(filterMode!=="favorites"||profile.league.favorites.includes(id));
    }).sort(([a,ca],[b,cb])=>sort==="level"?cb.level-ca.level||Number(a)-Number(b):sort==="name"?nameOf(pokemon.get(Number(a)),a).localeCompare(nameOf(pokemon.get(Number(b)),b)):Number(a)-Number(b));
    root.querySelector("#collection-visible-count").textContent=`${owned.length} / ${Object.keys(profile.collection).length} partenaires`;
    root.querySelector("#collection-empty").hidden=owned.length>0;
    writeMarkup("#owned-cards",owned.map(([key,card])=>{
      const id=Number(key),data=pokemon.get(id),inDeck=profile.deck.includes(id),rarity=rarityFor(id,data),favorite=profile.league.favorites.includes(id),name=nameOf(data,id);
      const maxHp=data?createCard(data,card.level,profile.characterId).maxHp:null;
      return `<article class="owned-card rarity-${rarity.id}${inDeck?" in-deck":""}"><div class="owned-top"><span>#${String(id).padStart(3,"0")}</span><strong>Niv. ${card.level} / 100</strong><button type="button" class="favorite-toggle" data-campaign-action="favorite" data-id="${id}" aria-label="${favorite?"Retirer":"Ajouter"} ${escape(name)} ${favorite?"des":"aux"} favoris" aria-pressed="${favorite}" ${!storage?"disabled":""}>${favorite?"★":"☆"}</button></div><span class="rarity-label">${rarity.label}</span>${cardPicture(id)}<h3>${escape(name)}</h3><div class="owned-types">${(data?.types??[]).map(({type})=>`<span data-type="${type.name}">${TYPE_LABELS[type.name]??type.name}</span>`).join("")}</div><p class="owned-bonus">${maxHp?`${maxHp} PV · `:""}+${(card.level-1)*10} % de statistiques</p>${pokemonXpMarkup(card.xp,name)}<p class="pokemon-training-hint">${card.level>=MAX_LEVEL?"Niveau maximum atteint !":"Mets un adversaire K.O. pour gagner de l’XP."}</p><button type="button" class="inspect-button" data-campaign-action="inspect" data-id="${id}" ${!data?"disabled":""}>Capacités & progression ↗</button><button type="button" class="deck-choice" data-campaign-action="deck" data-id="${id}" data-campaign-focus="deck-${id}" ${inDeck?"disabled":""}>${inDeck?"✓ Dans le deck":"Mettre dans le deck"}</button></article>`;
    }).join(""));

    writeMarkup("#booster-shop",boosterShopMarkup(BOOSTER_TYPES,profile,Boolean(storage)));
    root.querySelector("#booster-results").hidden = lastPack.length === 0;
    writeMarkup("#booster-cards", lastPack.map(({ id, isNew }) => `<article class="booster-result-card"><span class="reveal-label ${isNew ? "new-card" : "duplicate-card"}">${isNew ? "Pokémon débloqué" : "Déjà débloqué"}</span>${cardPicture(id)}<h3>${escape(nameOf(pokemon.get(id), id))}</h3><p>#${String(id).padStart(3, "0")} · Niv. ${profile.collection[id].level} · ${isNew ? "Prêt à s’entraîner" : "XP inchangée"}</p></article>`).join(""));
    if (inspectedId !== null && pokemon.has(inspectedId)) writeMarkup("#card-info-body", cardInfoMarkup(pokemon.get(inspectedId),profile.collection[inspectedId],profile.coins,profile.characterId));
    for (const button of root.querySelectorAll("[data-campaign-panel]")) {
      button.setAttribute("aria-pressed", String(button.dataset.campaignPanel === panel));
      button.disabled = loading || Boolean(battle && battle.phase !== "over");
    }
    for (const section of root.querySelectorAll("[data-campaign-section]")) section.hidden = section.dataset.campaignSection !== panel;
    if (focusKey) Array.from(root.querySelectorAll("[data-campaign-focus]")).find((element) => element.dataset.campaignFocus === focusKey && !element.disabled)?.focus({ preventScroll: true });
  }

  function showPanel(next) {
    if (battle || loading) {
      if (battle?.phase !== "over" || !closeFight()) return;
    }
    panel = next;
    renderHub();
    const destination=next==="home"?document.querySelector(".topbar"):root.querySelector(`[data-campaign-section="${next}"]`);
    destination?.scrollIntoView({ block:"start", behavior:profile.league.settings.motion?"smooth":"instant" });
  }

  function claimReward() {
    if (!rewardPending || !trainer) return true;
    if (!rewardRolls.length) rewardRolls = Array.from({ length:10 },() => Math.random());
    let rollIndex = 0;
    const free = trainer.mode === "free";
    const saved = commit((current) => free ? recordFreeVictory(current,trainer.id,battleId,{characterId:battleCharacterId}) : recordVictory(current, trainer.id, battleId,() => rewardRolls[rollIndex++],{characterId:battleCharacterId}), free ? "Victoire ! Ton or et ton XP sont sauvegardés. Tu peux réaffronter ce dresseur." : "Victoire ! La prochaine rencontre est débloquée et tes récompenses sont sauvegardées.");
    if (saved) { rewardPending = false; rewarded = true; routeRegion = Math.min(9,Math.floor(profile.adventureWins/10)); renderHub(); }
    return saved;
  }

  function renderFight() {
    fightBox.hidden = !loading && !battle;
    root.querySelector("#campaign-arena").hidden = !battle;
    root.querySelector("#campaign-fight-name").textContent = trainer ? `Toi contre ${trainer.name}` : "Combat";
    root.querySelector("#campaign-fight-round").textContent = battle ? `TOUR ${battle.turnNumber}` : "PRÉPARATION";
    root.querySelector('[data-campaign-action="back"]').textContent = trainer?.mode === "free" ? "Retour aux dresseurs" : "Retour à la route";
    root.querySelector("#pokemon-xp-status").textContent = pokemonXpNotice;
    const result = root.querySelector("#campaign-result");
    result.hidden = !battle || battle.phase !== "over";
    if (loading) { fightStatus.textContent = "Chargement de ton deck et de l’équipe adverse…"; return; }
    root.querySelector("#battle-bag").hidden=!battle||battle.phase==="over";
    if (!battle) return;
    writeMarkup("#battle-bag",battleBagMarkup(profile,battle));
    arena.dataset.region=String(trainer?.region??Math.min(9,Math.floor((trainer?.level??1)/2)));
    const recentType=battle.lastEvent?.type??"normal";
    arena.dataset.effect=recentType;
    arena.classList.toggle("has-impact",Boolean(battle.lastEvent?.damageApplied>0));
    arena.innerHTML = playerMarkup(battle, 0, { label: "Ton équipe", idPrefix: "campaign" }) + '<span class="arena-vs" aria-hidden="true">VS</span>' + playerMarkup(battle, 1, { label: trainer.name, controlled: false, showXpReward:true, idPrefix: "campaign", portraitIndex: trainer.portraitIndex });
    fightStatus.textContent = battle.phase === "over" ? battle.winner === 0 ? `Victoire ! Tu as vaincu ${trainer.name}.` : `Défaite face à ${trainer.name}. Réessaie avec une autre équipe ou entraîne tes Pokémon !` : battle.turn === 0 ? "À toi de jouer : choisis ton Pokémon et attaque !" : `${trainer.name} réfléchit… Le robot joue automatiquement.`;
    root.querySelector("#campaign-fight-log").replaceChildren(...battle.log.slice().reverse().map((line) => {
      const item = document.createElement("li");
      item.textContent = line.replaceAll("Joueur 1", "Toi").replaceAll("Joueur 2", trainer.name);
      return item;
    }));
    if (battle.phase === "over") {
      root.querySelector("#campaign-result-title").textContent = battle.winner === 0 ? "Combat remporté !" : "Ce n’est que partie remise.";
      root.querySelector("#campaign-result-text").textContent = battle.winner === 0 ? rewarded ? trainer.mode === "free" ? `Tu as battu ${trainer.name} ! Tu peux le réaffronter pour gagner à nouveau de l’or.` : `Étape ${trainer.stage} remportée ! ${profile.adventureWins === 100 ? "Les 100 rencontres sont terminées." : `La rencontre ${profile.adventureWins+1} est débloquée.`}` : "Ta récompense attend sa sauvegarde. Réessaie de la récupérer." : "Ton deck et ta collection sont conservés. Aucun frais, aucune carte perdue.";
      const rewardCharacter=getCharacter(battleCharacterId);
      const reward = profile.lastReward?.battleId === battleId ? profile.lastReward : null;
      writeMarkup("#adventure-rewards", reward && rewarded ? `<div class="reward-summary"><span><strong>+${reward.coins}</strong> OR</span><span><strong>+${reward.xp}</strong> XP</span>${reward.cards.length ? `<span><strong>+${reward.cards.length}</strong> CARTE(S)</span>` : ""}</div><div class="reward-cards">${reward.cards.map(id => `<div>${cardPicture(id)}<span>${escape(nameOf(pokemon.get(id),id))}</span><small>Niv. ${profile.collection[id].level} · XP inchangée</small></div>`).join("")}</div>${rewardCharacter ? `<p class="reward-character-note">Bonus de ${rewardCharacter.name} inclus : ${rewardCharacter.bonus}.</p>` : ""}<p class="reward-saved">✓ Récompenses ajoutées à ta sauvegarde${trainer.stage%10===0 ? " · Bonus de gardien inclus !" : ""}</p>` : "");
      root.querySelector("#continue-adventure").textContent = trainer.mode === "free" ? "Revoir les dresseurs →" : "Continuer l’aventure →";
      root.querySelector("#continue-adventure").hidden = battle.winner !== 0 || !rewarded;
      const replay = root.querySelector("#replay-campaign");
      const advance = trainer.mode !== "free" && battle.winner === 0;
      replay.hidden = advance && profile.adventureWins >= TRAINERS.length;
      replay.disabled = rewardPending || !storage;
      replay.textContent = advance ? "Combat suivant →" : "Recommencer le combat ↻";
      root.querySelector("#claim-reward").hidden = !rewardPending;
      root.querySelector("#open-reward-boosters").hidden = battle.winner !== 0 || !rewarded;
    }
  }

  function setBattle(next) {
    const previous=battle;
    bot$.next(null);
    battle = next;
    if (battle.phase === "handoff" && battle.turn === 0) battle = beginTurn(battle, 0);
    if (battle.phase === "over" && battle.winner === 0 && !rewarded) { rewardPending = true; claimReward(); }
    if(battle.phase==="over"&&battle.winner===1&&!defeatRecorded)defeatRecorded=commit(current=>recordDefeat(current,battleId,trainer.name),"Ton équipe reviendra plus forte. L’XP déjà gagnée est conservée.");
    if(battle.lastEvent&&battle.lastEvent!==previous?.lastEvent)playGameSound(battle.phase==="over"?(battle.winner===0?"win":"loss"):battle.lastEvent.kind==="item"?"item":battle.lastEvent.knockedOut?"ko":battle.lastEvent.kind==="technique"||battle.lastEvent.kind==="special"?"special":"hit",profile.league.settings.sound);

    renderFight();
    if (battle.phase !== "over" && battle.turn === 1) bot$.next({ state: battle, token: battleId });
  }

  function closeFight() {
    if (rewardPending && !claimReward()) return false;
    bot$.next(null);
    fights$.next(null);
    battle = null;
    loading = false;
    trainer = null;
    battleCharacterId = null;
    pokemonXpNotice = "";
    rewardPending = false;
    rewarded = false;
    renderFight();
    renderHub();
    return true;
  }

  function startFight(id) {
    const selected = [...TRAINERS,...FREE_TRAINERS].find((item) => item.id === id);
    if (!selected || !storage || loading) return;
    if (rewardPending && !claimReward()) return;
    try { profile = loadProfile(storage); } catch { return; }
    if (selected.mode !== "free" && !canChallengeTrainer(profile,id)) { notice = "Tu dois affronter les dresseurs dans l’ordre : 1, puis 2, puis 3…"; renderHub(); return; }
    if (battle && battle.phase !== "over") return;
    rewardRolls = [];
    defeatRecorded = false;
    pokemonXpNotice = "";
    battleCharacterId = profile.characterId;
    bot$.next(null);
    trainer = selected;
    battleId = crypto.randomUUID();
    battle = null;
    loading = true;
    rewarded = false;
    rewardPending = false;
    notice = "";
    renderHub();
    renderFight();
    fightBox.scrollIntoView({ block: "start", behavior: "smooth" });
    fights$.next({ trainer: selected, token: battleId, characterId:battleCharacterId, deck: [...profile.deck], levels: profile.deck.map((pokemonId) => profile.collection[pokemonId].level), experience:profile.deck.map(id=>profile.collection[id].xp) });
  }

  subscriptions.add(metadata$.pipe(mergeMap((id) => getPokemon$(String(id)).pipe(
    map((data) => ({ id, data })),
    catchError(() => { requested.delete(id); return of(null); })
  ), 4)).subscribe((result) => {
    if (result) pokemon.set(result.id, result.data);
    renderHub();
    if (battle?.phase === "over") renderFight();
  }));

  subscriptions.add(fights$.pipe(switchMap((request) => request ? forkJoin([...request.deck, ...request.trainer.team].map((id) => getPokemon$(String(id)))).pipe(
    map((cards) => ({ request, cards })),
    catchError(() => of({ request, error: true }))
  ) : EMPTY)).subscribe((result) => {
    if (result.request.token !== battleId) return;
    loading = false;
    if (result.error) {
      notice = "Impossible de charger ce combat depuis PokéAPI. Réessaie ; aucune pièce ni carte n’a été dépensée.";
      battle = null;
      renderHub();
      renderFight();
      return;
    }
    for (const card of result.cards) pokemon.set(card.id, card);
    try {
      setBattle(createBattle(result.cards, { allowSharedSpecies: true, playerCharacterId:result.request.characterId, experience:result.request.experience, levels: [...result.request.levels, ...Array(5).fill(result.request.trainer.level)] }));
      renderHub();
    } catch (error) {
      battle = null;
      notice = error.message;
      renderHub();
      renderFight();
    }
  }));

  subscriptions.add(bot$.pipe(switchMap((request) => request ? timer(700).pipe(map(() => request)) : EMPTY)).subscribe(({ state, token }) => {
    if (token !== battleId || state !== battle || battle.phase === "over") return;
    let next = state.phase === "handoff" ? beginTurn(state, 1) : state;
    const action = chooseBotAction(next, trainer.difficulty);
    if (!action) return;
    next = selectPokemon(next, 1, action.index);
    next = action.kind === "guard" ? defend(next,1) : attack(next,1,action.kind);
    setBattle(next);
    if (next.phase === "over") renderHub();
  }));

  subscriptions.add(fromEvent(root, "click").subscribe((event) => {
    const panelButton = event.target.closest("[data-campaign-panel]");
    if (panelButton && !panelButton.disabled) { showPanel(panelButton.dataset.campaignPanel); return; }
    const button = event.target.closest("button[data-campaign-action]");
    if (!button || button.disabled || !root.contains(button)) return;
    const action = button.dataset.campaignAction;
    const id = Number(button.dataset.id);
    if(action==="help")root.querySelector("#game-guide").showModal();
    if(action==="close-guide")root.querySelector("#game-guide").close();
    if(action==="close-settings")root.querySelector("#game-settings").close();
    if(action==="claim-mission"&&!battle&&!loading){if(commit(current=>claimMission(current,button.dataset.mission),"Récompense récupérée ! L’or et l’XP dresseur sont sauvegardés."))playGameSound("reward",profile.league.settings.sound);}
    if(action==="favorite")commit(current=>toggleFavorite(current,id));
    if(action==="buy-item")commit(current=>buyItem(current,button.dataset.item),`${ITEMS[button.dataset.item]?.name??"Objet"} ajouté à ton sac.`);
    if(action==="use-item"&&battle){
      const item=ITEMS[button.dataset.item],next=useBattleItem(battle,0,item);
      if(next!==battle&&commit(current=>consumeItem(current,item.id))){pokemonXpNotice=`${item.name} utilisé. À l’adversaire de jouer.`;setBattle(next);}
    }
    if(action==="toggle-sound"){if(commit(current=>updateSettings(current,{sound:!current.league.settings.sound})))playGameSound("reward",profile.league.settings.sound);}
    if(action==="toggle-motion")commit(current=>updateSettings(current,{motion:!current.league.settings.motion}));
    if(action==="export-save"){
      try{const latest=loadProfile(storage),blob=new Blob([JSON.stringify(latest,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download=`kanto-odyssee-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{root.querySelector("#import-preview").textContent="Impossible d’exporter la sauvegarde.";}
    }
    if(action==="confirm-import"&&pendingImport&&!battle&&!loading){
      if(commit(()=>normalizeProfile(pendingImport),"Ta sauvegarde a été importée avec succès.")){pendingImport=null;root.querySelector("#confirm-import").hidden=true;root.querySelector("#import-preview").textContent="Sauvegarde importée. Tu peux reprendre ton aventure.";routeRegion=Math.min(9,Math.floor(profile.adventureWins/10));renderHub();}
    }
    if (action === "choose-character") {
      if (loading || (battle && battle.phase!=="over")) { notice="Choisis ton personnage entre deux combats."; renderHub(); return; }
      const characterId=button.dataset.character || null, chosen=getCharacter(characterId);
      commit(current=>selectCharacter(current,characterId),chosen ? `${chosen.name} sélectionné${["aurore","lyra","enora","naya","tess"].includes(characterId) ? "e" : ""} ! ${chosen.bonus}.` : "Personnage retiré. Tu joues avec les valeurs de base.");
    }
    if (action === "fight") startFight(button.dataset.trainer);
    if (action === "replay" && battle?.phase === "over" && trainer) {
      const target = trainer.mode === "free" || battle.winner !== 0 ? trainer : TRAINERS[profile.adventureWins];
      if (target) startFight(target.id);
    }
    if (action === "free-level") { const level = Number(button.dataset.level); root.querySelector(`#free-level-group-${level}`)?.scrollIntoView({block:"start",behavior:"smooth"}); }
    if (action === "region") { routeRegion = Math.max(0,Math.min(9,Number(button.dataset.region))); renderHub(); }
    if (action === "route-current") { routeRegion = Math.min(9,Math.floor(profile.adventureWins/10)); renderHub(); }
    if (action === "continue") { const nextPanel = trainer?.mode === "free" ? "free" : "trainers"; if (closeFight()) { routeRegion = Math.min(9,Math.floor(profile.adventureWins/10)); showPanel(nextPanel); } }
    if (action === "back") closeFight();
    if (action === "deck") { replacement = id; renderHub(); root.querySelector("#replacement-picker").scrollIntoView({ block: "center", behavior: "smooth" }); }
    if (action === "replace") {
      const newId = replacement;
      if (commit((current) => replaceDeckCard(current, Number(button.dataset.oldId), newId), "Ton deck de 5 cartes a été mis à jour.")) replacement = null;
      renderHub();
    }
    if (action === "cancel-replace") { replacement = null; renderHub(); }
    if (action === "buy") commit((current) => buyBooster(current,button.dataset.pack), "Booster acheté ! Tu peux maintenant l’ouvrir dans la boutique.");
    if (action === "open") {
      let opened;
      if (commit((current) => { opened = openBooster(current,button.dataset.pack); return opened.profile; }, "Booster ouvert ! Les Pokémon débloqués commencent au niveau 1 ; les doublons ne donnent pas d’XP.")) {
        playGameSound("reward",profile.league.settings.sound);
        lastPack = opened.cards;
        root.querySelector("#booster-results-title").textContent = `Tes ${lastPack.length} cartes obtenues`;
        renderHub();
        queuePokemon(lastPack.map((card) => card.id));
      }
    }
    if (action === "inspect") {
      inspectedId = id;
      renderHub();
      root.querySelector("#card-info-dialog").showModal();
    }
    if (action === "close-card") root.querySelector("#card-info-dialog").close();
    if (action === "reward") { claimReward(); renderFight(); }
    if (action === "boosters") { if (closeFight()) showPanel("boosters"); }
  }));

  subscriptions.add(fromEvent(arena, "click").subscribe((event) => {
    const button = event.target.closest("button[data-action]");
    if (!button || button.disabled || !battle || battle.phase !== "playing" || battle.turn !== 0 || Number(button.dataset.player) !== 0) return;
    if (button.dataset.action === "select") setBattle(selectPokemon(battle, 0, Number(button.dataset.index)));
    if (button.dataset.action === "guard") setBattle(defend(battle,0));
    if (button.dataset.action === "attack") {
      const before = battle, next = attack(before,0,button.dataset.kind);
      if (next === before) return;
      if (!next.lastEvent.knockedOut) {
        pokemonXpNotice = "Pas de K.O. : aucune XP gagnée.";
        setBattle(next);
        return;
      }
      const opponent = before.teams[1][before.active[1]];
      const attacker = before.teams[0][before.active[0]], previousXp = profile.collection[attacker.id].xp;
      if (!commit(current=>recordPokemonAttack(current,battleId,before,next))) {
        pokemonXpNotice = "Impossible de sauvegarder l’XP. L’attaque n’a pas été jouée : réessaie.";
        renderFight();
        return;
      }
      const owned = profile.collection[attacker.id], gained = Math.max(0,owned.xp-previousXp);
      pokemonXpNotice = `K.O. de ${opponent.name} (Niv. ${opponent.level}) ! ${attacker.name} : +${gained} XP${owned.level > attacker.level ? ` · Niveau ${owned.level} atteint ! PV et capacités augmentés.` : owned.level >= MAX_LEVEL ? " · Niveau 100 maximum." : ". XP sauvegardée."}`;
      let progressed = withPokemonExperience(next,0,attacker.id,owned);
      progressed = {...progressed,log:[...progressed.log,pokemonXpNotice].slice(-10)};
      setBattle(progressed);
    }
  }));

  for(const selector of ["#collection-search","#collection-filter","#collection-sort"])subscriptions.add(fromEvent(root.querySelector(selector),selector==="#collection-search"?"input":"change").subscribe(()=>renderHub()));
  subscriptions.add(fromEvent(document.querySelector("#open-guide"),"click").subscribe(()=>{document.querySelector("#show-campaign").click();root.querySelector("#game-guide").showModal();}));
  subscriptions.add(fromEvent(document.querySelector("#open-settings"),"click").subscribe(()=>{document.querySelector("#show-campaign").click();root.querySelector("#game-settings").showModal();}));
  subscriptions.add(fromEvent(root.querySelector("#import-save"),"change").subscribe(async event=>{
    pendingImport=null;root.querySelector("#confirm-import").hidden=true;
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>2000000)throw new Error("Fichier trop volumineux.");const candidate=normalizeProfile(JSON.parse(await file.text()));pendingImport=candidate;root.querySelector("#import-preview").textContent=`Fichier prêt : ${Object.keys(candidate.collection).length} Pokémon, ${candidate.coins} or, étape ${candidate.adventureWins}/100. Confirme uniquement si tu veux remplacer la progression actuelle.`;root.querySelector("#confirm-import").hidden=false;}
    catch{root.querySelector("#import-preview").textContent="Ce fichier ne contient pas une sauvegarde valide. Ta progression est conservée.";}
    event.target.value="";
  }));

  subscriptions.add(fromEvent(window, "storage").pipe(filter((event) => event.key === SAVE_KEY)).subscribe(() => {
    if (!storage) return;
    try { profile = loadProfile(storage); renderHub(); queuePokemon(Object.keys(profile.collection)); } catch { notice = "La sauvegarde a changé et ne peut pas être relue."; renderHub(); }
  }));

  const modes = [
    ["#show-campaign", "#campaign-view"],
    ["#show-battle", "#battle-view"],
    ["#show-pokedex", "#pokedex-view"]
  ];
  for (const [buttonSelector, viewSelector] of modes) subscriptions.add(fromEvent(document.querySelector(buttonSelector), "click").subscribe(() => {
    for (const [otherButton, otherView] of modes) {
      document.querySelector(otherButton).setAttribute("aria-pressed", String(otherView === viewSelector));
      document.querySelector(otherView).hidden = otherView !== viewSelector;
    }
  }));

  subscriptions.add(() => { metadata$.complete(); fights$.complete(); bot$.complete(); });
  renderHub();
  queuePokemon(Object.keys(profile.collection));
  return subscriptions;
}
