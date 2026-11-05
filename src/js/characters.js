export const CHARACTERS = [
  { id:"aurore",name:"Aurore",role:"La gardienne",tag:"Vitalité",color:"#39816c",portrait:0,description:"Prends soin de ton équipe et tiens plus longtemps sur le terrain.",bonus:"+25 % de PV pour tes 5 Pokémon",effects:{hp:1.25} },
  { id:"kael",name:"Kael",role:"Le combattant",tag:"Puissance physique",color:"#b85548",portrait:1,description:"Fais parler la force de tes attaques physiques.",bonus:"+20 % de dégâts physiques",effects:{physicalDamage:1.2} },
  { id:"lyra",name:"Lyra",role:"La mystique",tag:"Attaques spéciales",color:"#8760b2",portrait:2,description:"Charge ton énergie puis libère des techniques plus puissantes.",bonus:"+25 % de dégâts avec Vague et l’ultime",effects:{specialDamage:1.25} },
  { id:"milo",name:"Milo",role:"Le marchand",tag:"Fortune",color:"#a77b31",portrait:3,description:"Transforme tes victoires en or pour débloquer de nouveaux Pokémon dans les boosters.",bonus:"+40 % d’or à chaque victoire",effects:{coins:1.4} },
  { id:"enora",name:"Énora",role:"La chercheuse",tag:"Expérience",color:"#477fab",portrait:4,description:"Apprends de chaque duel pour faire progresser ton profil.",bonus:"+50 % d’XP à chaque victoire",effects:{xp:1.5} },
  { id:"bastien",name:"Bastien",role:"Le protecteur",tag:"Résistance",color:"#5c708a",portrait:5,description:"Encaisse les attaques adverses grâce à une solide défense.",bonus:"−15 % de dégâts reçus par tes Pokémon",effects:{damageTaken:.85} },
  { id:"naya",name:"Naya",role:"L’éclaireuse",tag:"Énergie",color:"#a88a25",portrait:6,description:"Prépare tes techniques spéciales dès l’entrée dans l’arène.",bonus:"Tes 5 Pokémon commencent avec 1 charge",effects:{startingCharge:1} },
  { id:"soren",name:"Soren",role:"Le rôdeur",tag:"Équilibre",color:"#3c8a89",portrait:7,description:"Associe endurance et puissance pour t’adapter à chaque adversaire.",bonus:"+10 % de PV et +10 % de tous les dégâts",effects:{hp:1.1,physicalDamage:1.1,specialDamage:1.1} },
  { id:"tess",name:"Tess",role:"L’aventurière",tag:"Progression",color:"#b55f7e",portrait:8,description:"Repars de chaque victoire avec un peu plus de tout.",bonus:"+20 % d’or et +20 % d’XP",effects:{coins:1.2,xp:1.2} }
];
const DEFAULT_EFFECTS = Object.freeze({hp:1,physicalDamage:1,specialDamage:1,damageTaken:1,startingCharge:0,coins:1,xp:1});
export function getCharacter(id) { return CHARACTERS.find(character=>character.id===id) ?? null; }
export function characterEffects(id) { return {...DEFAULT_EFFECTS,...getCharacter(id)?.effects}; }
export function characterReward(reward,id) {
  const effects=characterEffects(id);
  return {...reward,coins:Math.round(reward.coins*effects.coins),xp:Math.round(reward.xp*effects.xp)};
}
