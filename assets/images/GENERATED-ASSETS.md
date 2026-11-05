# Visuels du jeu

Générés avec l’outil intégré imagegen (aucune API/CLI de secours).

Fichiers enregistrés dans ce dossier Windows :
- `C:/Users/Ekiwax/Documents/HTML CSS PREPANUM/Nouveau dossier/assets-generated/kanto-banner-v1.png`
- `C:/Users/Ekiwax/Documents/HTML CSS PREPANUM/Nouveau dossier/assets-generated/trainer-atlas-v1.png`

Copies utilisées par le jeu :
- `/home/ekiwax/projets/mon-projet/assets/images/kanto-banner-v1.png`
- `/home/ekiwax/projets/mon-projet/assets/images/trainer-atlas-v1.png`

L’atlas est une grille de 5 colonnes sur 3 rangées, indexée dans le même ordre que les 15 dresseurs.

## Prompt final : bannière

Use case: stylized-concept. Asset type: wide horizontal 3:1 fantasy game website banner, no words. A beautiful original hand-painted anime adventure landscape: an emerald forest valley, winding footpath, a small inviting village, distant misty mountains and a circular stone battle arena with warm golden accents on the RIGHT side. Golden afternoon sunlight through soft clouds, rich forest green, sage, warm cream, restrained red flowers. LEFT third is naturally shadowed forest foliage with uncluttered dark green negative space for white HTML title overlay. Cinematic game key art, polished painterly detail, serene sense of adventure. Landscape scenery only, no people, no animals, no creatures, no characters, no text, no logo, no watermark, no user interface. Wide panoramic composition.

## Prompt final : portraits

Use case: stylized-concept. Asset type: one single game portrait ATLAS asset, exactly 5 columns by 3 rows, 15 equal perfectly square cells, aspect ratio 5:3. Every cell contains ONE different original anime Pokémon-style human trainer head-and-shoulders portrait, face centered in that cell. Consistent clean hand-painted anime game art, soft neutral cream/sage backgrounds per cell, no text, no labels, no watermark, no borders, no gaps. Row 1 left to right: young friendly boy brown hair green baseball cap; young girl dark hair pale blue scarf; teenage camping boy sandy hair orange backpack straps; young botanical girl auburn hair green jacket; teenage rival boy black hair red sports jacket. Row 2: confident woman violet hair dark teal jacket; athletic man dark skin short hair rock-gray vest; female swimmer blue bob and sporty jacket; adventurous young man curly brown hair red cap; strategic woman long dark hair glasses cream coat. Row 3: mature veteran man gray hair emerald coat; confident woman red hair flame-orange jacket; mysterious man violet-black hair dark collar; elegant woman silver hair midnight-blue cape; final champion man dark hair gold-accent black jacket. Diverse skin tones, vivid expressive eyes. Each portrait stays strictly inside its own equal square tile with identical zoom and margin, exactly 15 portraits arranged in the requested 5 by 3 regular grid. Chest-up portraits, not full bodies. This is one cohesive sprite atlas, not separate images.



## Paysages d’aventure v1

Outil intégré imagegen. Atlas de 10 paysages, 2 colonnes × 5 rangées.

Fichier conservé : `C:/Users/Ekiwax/Documents/HTML CSS PREPANUM/Nouveau dossier/assets-generated/adventure-landscapes-v1.png`

Copie utilisée par le jeu : `/home/ekiwax/projets/mon-projet/assets/images/adventure-landscapes-v1.png`

Prompt final et outil :

```json
{"asset":"adventure-landscapes-v1.png","tool":"image_gen built-in","prompt":"Use case: stylized-concept. Asset type: background sprite atlas for a browser adventure map. Create ONE portrait image with an EXACT seamless regular grid of 2 columns and 5 rows, ten rectangular scenic tiles, no gutters or borders. Each cell has a 5:3 landscape aspect ratio; total atlas ratio 2:3. Each tile is a beautiful richly painted anime game environment viewed from a high bird's-eye perspective, suitable behind an overlaid winding route and trainer portrait markers. Keep the center area of each tile relatively open terrain, with richer scenery around edges. Row1 left sunny green meadow with flower fields and cottages, right deep emerald forest with giant trees. Row2 left blue river with wooden bridges and reeds, right turquoise coast with sand and sea cliffs. Row3 left golden autumn hills and windmills, right rocky mountain valley with waterfalls. Row4 left violet crystal cavern with luminous pools, right snowy alpine pine valley. Row5 left dramatic volcanic basalt landscape with small glowing lava streams, right majestic championship garden with a white castle at the horizon and sunset sky. Consistent hand-painted adventure illustration style, soft cel shading, polished detailed scenery, warm inviting colors, clear distinct atmosphere per tile. Environment ONLY: no people, creatures, portraits, text, letters, numbers, labels, logos, markers, circles, frames, cards, UI or icons. Do not draw roads; code will overlay the route."}
```


## Neuf personnages jouables

Atlas créé avec imagegen intégré : /home/ekiwax/projets/mon-projet/assets/images/characters-atlas-v1.png. Copie Windows : C:/Users/Ekiwax/Documents/HTML CSS PREPANUM/Nouveau dossier/assets-generated/characters-atlas-v1.png.

Prompt et outil :

{
  "asset": "characters-atlas-v1.png",
  "tool": "image_gen built-in",
  "source": "C:/Users/Ekiwax/.codex/generated_images/01a19bf0-21d1-7593-a6e5-1654cd64d687/exec-355b24f0-f23f-43b4-bc96-19896eed585d.png",
  "prompt": "Use case: stylized-concept. Asset type: original character portrait sprite atlas for a friendly monster-battling browser card game. Create ONE square image, an EXACT regular 3 by 3 grid of nine equally sized square portraits, no gutters, no borders, no typography. Each cell contains one distinct ORIGINAL anime human trainer, waist-up or head-and-shoulders centered with the whole head visible and generous breathing room, painted polished cel-shaded illustration, expressive faces, tasteful detailed clothing, warm natural lighting, consistent framing and art direction. Top row left: Aurore, young adult woman guardian, mint-green healer explorer jacket, dark curly hair, warm confident smile, soft emerald woodland background. Top row center: Kael, young adult male martial fighter, red sporty jacket, short brown hair, determined upbeat expression, warm brick-red background. Top row right: Lyra, young adult woman mystic, lavender cloak, silver-purple bob haircut, violet eyes, magical violet dusk background. Middle row left: Milo, friendly young adult male merchant, honey-colored vest and elegant dark jacket, tan skin and black wavy hair, amber bazaar glow background. Middle row center: Enora, young adult woman researcher, bright blue field coat and round glasses, auburn hair tied back, scholarly cheerful expression, blue laboratory library background. Middle row right: Bastien, broad-shouldered adult male protector, navy and steel-gray outdoor armor jacket, dark skin, closely cropped hair, calm expression, slate-blue mountain background. Bottom row left: Naya, energetic young adult woman scout, vivid yellow sporty windbreaker, dark ponytail, joyful expression, yellow electric sunset background. Bottom row center: Soren, young adult male balanced ranger, teal explorer coat, reddish-blond hair, focused friendly expression, turquoise valley background. Bottom row right: Tess, young adult woman adventurer and treasure hunter, coral-pink jacket with gold accents, brown skin, black braided hair, charismatic smile, rose-gold sunrise background. Characters have no props obscuring their faces. EXACT nine unique people, one person per square. No creatures, no franchise characters, no words, letters, numbers, labels, logos, UI, badges, card borders, contact-sheet gaps or watermark."
}
