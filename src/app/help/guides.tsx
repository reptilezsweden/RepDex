// The user guides (Help). English and Swedish; Japanese readers get the English text with a note.
// Each guide: a slug (its address, /help/<slug>), a title, a one-line summary and the body.
import Link from "next/link";
import type { ReactNode } from "react";
import { BadgeIcon, PuzzleIcon, StarIcon } from "@/components/mon-ui";
import type { Lang } from "@/lib/i18n";

type Text = { en: string; sv: string };
export interface Guide { slug: string; title: Text; summary: Text; body: { en: ReactNode; sv: ReactNode } }

/** English for Japanese until the guides are translated. */
export const guideLang = (lang: Lang): "en" | "sv" => (lang === "sv" ? "sv" : "en");

const Check = () => (
  <span className="tick legend-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="10" /><path d="M7.5 12.5l3 3 6-6.5" /></svg>
  </span>
);
const G = ({ to, children }: { to: string; children?: ReactNode }) => <Link href={`/help/${to}`}>{children}</Link>;

export const GUIDES: Guide[] = [
  {
    slug: "first-use",
    title: { en: "Getting started", sv: "Kom igång" },
    summary: {
      en: "Set up your collection in four steps: settings, spreadsheet (optional), batch ticking, then everyday ticking.",
      sv: "Lägg upp din samling i fyra steg: inställningar, kalkylark (valfritt), massbockning och sedan vardagsbockning.",
    },
    body: {
      en: (
        <>
          <p>RepDex keeps track of what you've collected in Pokémon GO, dex by dex. Setting up a collection that already has hundreds of Pokémon goes fastest in this order.</p>
          <h2>1. Settings first</h2>
          <p>Go to <Link href="/settings">Settings</Link> and choose before you start ticking, because these choices decide what the dex pages and the spreadsheet contain:</p>
          <ul>
            <li><b>Visible dexes</b>: the dexes you want to track. Start small; you can switch more on later.</li>
            <li><b>Shiny</b>: which dexes get a shiny version.</li>
            <li><b>All forms</b>: where every form (costumes, regional forms…) should count separately.</li>
            <li><b>Gender ♂ / ♀</b>: where you want to tick male and female separately.</li>
            <li>Your <b>language</b> and your <b>in-game nickname</b> (used on your public wishlists).</li>
          </ul>
          <p>Start with <b>Caught</b>: ticking Lucky, XXL, XXS, 100% or a shiny also ticks Caught, so Caught should be right first. See the <G to="settings">Settings guide</G> for what each choice does.</p>
          <h2>2. Spreadsheet: export, fill in, import (optional)</h2>
          <p>If you already track your collection somewhere else, or simply have a lot to enter, download the spreadsheet under <Link href="/settings">Settings → Spreadsheet</Link>, fill it in and upload it again. You'll see what changes before anything is saved. See the <G to="spreadsheet">Spreadsheet guide</G>.</p>
          <h2>3. Batch ticking</h2>
          <p>On a dex page, <b>Check all</b> ticks everything in the current view. It's usually faster to tick everything and then untick what you don't have:</p>
          <ul>
            <li>Narrow the view first if you like: pick a <b>generation</b>, or search a Pokémon and switch on <b>Search whole family</b>, then use Check all on just those.</li>
            <li>Then switch the view to <b>Missing</b> or <b>Collected</b> and untick the few that aren't right.</li>
            <li>Check all and Uncheck all ask for confirmation (slide to unlock), and let you choose which ticks (e.g. Collected and Shiny) to change.</li>
          </ul>
          <p>Use the <b>In game</b> view for the first pass: each card is a whole species, like the in-game Pokédex. Do <b>All forms</b> afterwards.</p>
          <h2>4. Everyday ticking</h2>
          <p>From then on, tap a card's icons as you catch things. Mark Pokémon you have but still want (e.g. a better one) as <b>wanted</b>, and use the ♂/♀ rows where gender is on. See the <G to="dexes">Dexes guide</G>.</p>
          <h2>You're set</h2>
          <ul>
            <li>Check your progress on the <Link href="/dexes">Dexes</Link> page counters.</li>
            <li>Make a wishlist public and send its link to trading partners: <G to="wishlists">Wishlists guide</G>.</li>
            <li>Install RepDex on your Home Screen: <G to="install">Install the app</G>.</li>
            <li>See what you're missing from current events: <G to="events">Events guide</G>.</li>
          </ul>
          <p className="note">Switching a dex off never deletes ticks, and you can download the spreadsheet any time as a backup.</p>
        </>
      ),
      sv: (
        <>
          <p>RepDex håller koll på vad du har samlat i Pokémon GO, dex för dex. Har du redan hundratals Pokémon går det snabbast att lägga upp samlingen i den här ordningen.</p>
          <h2>1. Inställningar först</h2>
          <p>Gå till <Link href="/settings">Inställningar</Link> och välj innan du börjar bocka, för valen avgör vad dexsidorna och kalkylarket innehåller:</p>
          <ul>
            <li><b>Synliga dexar</b>: de dexar du vill följa. Börja med få; du kan slå på fler senare.</li>
            <li><b>Shiny</b>: vilka dexar som får en shiny-version.</li>
            <li><b>Alla former</b>: var varje form (kostymer, regionala former…) ska räknas för sig.</li>
            <li><b>Kön ♂ / ♀</b>: var du vill bocka hane och hona var för sig.</li>
            <li>Ditt <b>språk</b> och ditt <b>smeknamn i spelet</b> (syns på dina publika önskelistor).</li>
          </ul>
          <p>Börja med <b>Fångade</b>: att bocka Lucky, XXL, XXS, 100% eller en shiny bockar även Fångade, så Fångade bör vara rätt först. Se <G to="settings">guiden för inställningar</G> för vad varje val gör.</p>
          <h2>2. Kalkylark: exportera, fyll i, importera (valfritt)</h2>
          <p>Har du redan koll på samlingen någon annanstans, eller bara mycket att fylla i, ladda ner kalkylarket under <Link href="/settings">Inställningar → Kalkylark</Link>, fyll i det och ladda upp det igen. Du ser vad som ändras innan något sparas. Se <G to="spreadsheet">guiden för kalkylarket</G>.</p>
          <h2>3. Massbockning</h2>
          <p>På en dexsida bockar <b>Markera alla</b> av allt i den aktuella vyn. Oftast går det fortast att bocka allt och sedan avbocka det du inte har:</p>
          <ul>
            <li>Smalna av vyn först om du vill: välj en <b>generation</b>, eller sök en Pokémon och slå på <b>Sök hela familjen</b>, och använd Markera alla på bara dem.</li>
            <li>Växla sedan vyn till <b>Saknas</b> eller <b>Insamlade</b> och avbocka de få som inte stämmer.</li>
            <li>Markera alla och Avmarkera alla ber om bekräftelse (dra för att låsa upp) och låter dig välja vilka bockar (t.ex. Insamlad och Shiny) som ändras.</li>
          </ul>
          <p>Använd vyn <b>I spelet</b> först: varje kort är en hel art, som Pokédexen i spelet. Ta <b>Alla former</b> efteråt.</p>
          <h2>4. Vardagsbockning</h2>
          <p>Därefter trycker du på kortens ikoner när du fångar något. Markera Pokémon du har men ändå vill ha (t.ex. en bättre) som <b>önskad</b>, och använd ♂/♀-raderna där kön är på. Se <G to="dexes">guiden för dexar</G>.</p>
          <h2>Klart</h2>
          <ul>
            <li>Följ dina framsteg på räknarna på sidan <Link href="/dexes">Dexar</Link>.</li>
            <li>Gör en önskelista publik och skicka länken till bytespartners: <G to="wishlists">guiden för önskelistor</G>.</li>
            <li>Installera RepDex på hemskärmen: <G to="install">Installera appen</G>.</li>
            <li>Se vad du saknar från pågående händelser: <G to="events">guiden för händelser</G>.</li>
          </ul>
          <p className="note">Att stänga av en dex tar aldrig bort bockar, och du kan ladda ner kalkylarket när som helst som säkerhetskopia.</p>
        </>
      ),
    },
  },
  {
    slug: "settings",
    title: { en: "Settings", sv: "Inställningar" },
    summary: { en: "How each setting changes which dexes and ticks you see.", sv: "Hur varje inställning ändrar vilka dexar och bockar du ser." },
    body: {
      en: (
        <>
          <h2>Visible dexes</h2>
          <p>Each switched-on dex gets a box on the <Link href="/dexes">Dexes</Link> page, a dex page, a column in Full collection, a tab in the spreadsheet and (where there is one) a wishlist. Caught is always on. XXL/XXS and Shadow/Purified are switched together and share a page.</p>
          <p>Switching a dex off only hides it: your ticks are kept, and come back when you switch it on again.</p>
          <h2>Shiny</h2>
          <ul>
            <li><b>Show shiny</b> adds the Shiny dex, for the shiny version of each Caught Pokémon.</li>
            <li><b>Show Shiny ⭐⭐⭐</b> adds a three-star tick to the Shiny dex, for 3-star (perfect) shinies. Not in the game; RepDex only.</li>
            <li><b>Show shiny Shadow/Purified, Mega, Gigantamax, Dynamax, Costume/Event</b> add a star to those dexes' cards, with its own counter.</li>
          </ul>
          <p>A shiny tick also ticks its regular tick (a shiny Caught Pokémon is caught).</p>
          <h2>All forms</h2>
          <p>By default a dex counts like the game's Pokédex: one card per species, collected when any form is. With <b>All forms</b> on, the dex also gets an <b>All forms</b> view where every form (costumes, regional forms, sizes of Pumpkaboo…) is a card of its own, with its own counter. Mega, Gigantamax, Dynamax and Costume/Event always count every form.</p>
          <h2>Gender ♂ / ♀</h2>
          <p>For the chosen dexes, every Pokémon that comes in both genders gets a ♂ row and a ♀ row on its card, ticked separately. Counters then read "<i>both</i> or <i>either</i> / total", e.g. "120 or 150 / 300 · 40% or 50%": 120 with both genders ticked, 150 with at least one.</p>
          <ul>
            <li>Shiny and Shiny ⭐⭐⭐ have their own gender choice; other shiny stars follow their dex.</li>
            <li>If the dex itself doesn't track gender but its shiny does (e.g. Caught off, Shiny on), the ♀ row holds only the stars.</li>
            <li>Your existing ticks count as ♂. Indeedee, Basculegion and Oinkologne already have a form per gender and get no extra rows.</li>
          </ul>
          <h2>How the choices combine</h2>
          <ul>
            <li>Caught + Shiny + gender on Caught only: Caught cards have ♂ and ♀ checkmarks; the Shiny dex has one star per Pokémon.</li>
            <li>Shadow/Purified + shiny Shadow/Purified: one page with four ticks per card (Shadow, shiny Shadow, Purified, shiny Purified).</li>
            <li>Costume/Event + All forms makes no difference: costumes always count one by one.</li>
          </ul>
          <p>Choices for a dex that's switched off are greyed out but kept.</p>
          <h2>Other settings</h2>
          <ul>
            <li><b>Language</b>: English, Svenska or 日本語. Pokémon names follow it where translated.</li>
            <li><b>Nickname</b>: your Pokémon GO trainer name, used for your public wishlist page.</li>
            <li><b>Spreadsheet</b>: see the <G to="spreadsheet">Spreadsheet guide</G>.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <h2>Synliga dexar</h2>
          <p>Varje påslagen dex får en ruta på sidan <Link href="/dexes">Dexar</Link>, en dexsida, en kolumn i Hela samlingen, en flik i kalkylarket och (där det finns) en önskelista. Fångade är alltid på. XXL/XXS och Shadow/Purified slås på tillsammans och delar sida.</p>
          <p>Att stänga av en dex döljer den bara: dina bockar sparas och kommer tillbaka när du slår på den igen.</p>
          <h2>Shiny</h2>
          <ul>
            <li><b>Visa shiny</b> lägger till Shiny-dexen, för shiny-versionen av varje fångad Pokémon.</li>
            <li><b>Visa Shiny ⭐⭐⭐</b> lägger till en tre-stjärnig bock i Shiny-dexen, för 3-stjärniga (perfekta) shinies. Finns inte i spelet; bara i RepDex.</li>
            <li><b>Visa shiny Shadow/Purified, Mega, Gigantamax, Dynamax, Kostym/Event</b> lägger till en stjärna på de dexarnas kort, med egen räknare.</li>
          </ul>
          <p>En shiny-bock bockar även sin vanliga bock (en shiny fångad Pokémon är fångad).</p>
          <h2>Alla former</h2>
          <p>Som standard räknar en dex som Pokédexen i spelet: ett kort per art, samlat när någon form är det. Med <b>Alla former</b> på får dexen även vyn <b>Alla former</b>, där varje form (kostymer, regionala former, Pumpkaboos storlekar…) är ett eget kort med egen räknare. Mega, Gigantamax, Dynamax och Kostym/Event räknar alltid varje form.</p>
          <h2>Kön ♂ / ♀</h2>
          <p>I de valda dexarna får varje Pokémon som finns i båda könen en ♂-rad och en ♀-rad på kortet, som bockas var för sig. Räknarna visar då "<i>båda</i> eller <i>något</i> / totalt", t.ex. "120 eller 150 / 300 · 40% eller 50%": 120 med båda könen bockade, 150 med minst ett.</p>
          <ul>
            <li>Shiny och Shiny ⭐⭐⭐ har ett eget könsval; andra shiny-stjärnor följer sin dex.</li>
            <li>Om dexen själv inte följer kön men dess shiny gör det (t.ex. Fångade av, Shiny på) har ♀-raden bara stjärnorna.</li>
            <li>Dina befintliga bockar räknas som ♂. Indeedee, Basculegion och Oinkologne har redan en form per kön och får inga extra rader.</li>
          </ul>
          <h2>Hur valen kombineras</h2>
          <ul>
            <li>Fångade + Shiny + kön bara på Fångade: Fångade-korten har ♂- och ♀-bockar; Shiny-dexen har en stjärna per Pokémon.</li>
            <li>Shadow/Purified + shiny Shadow/Purified: en sida med fyra bockar per kort (Shadow, shiny Shadow, Purified, shiny Purified).</li>
            <li>Kostym/Event + Alla former gör ingen skillnad: kostymer räknas alltid en och en.</li>
          </ul>
          <p>Val för en avstängd dex blir gråa men sparas.</p>
          <h2>Övriga inställningar</h2>
          <ul>
            <li><b>Språk</b>: English, Svenska eller 日本語. Pokémon-namn följer språket där de är översatta.</li>
            <li><b>Smeknamn</b>: ditt tränarnamn i Pokémon GO, används för din publika önskelistsida.</li>
            <li><b>Kalkylark</b>: se <G to="spreadsheet">guiden för kalkylarket</G>.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "dexes",
    title: { en: "Dexes", sv: "Dexar" },
    summary: { en: "Ticking, stars and badges, filters, Missing / Collected and wanted marks.", sv: "Bocka, stjärnor och märken, filter, Saknas / Insamlade och önskemarkeringar." },
    body: {
      en: (
        <>
          <h2>The Dexes page</h2>
          <p>One box per switched-on dex, with its counter and a progress bar; shiny and second dexes (XXS, Purified) are counted inside the same box. Tap a box to open the dex. With All forms on, the box has a second part for the All forms view. <b>Full collection</b> shows every dex in one table (<G to="full-collection">guide</G>).</p>
          <h2>Ticking</h2>
          <ul>
            <li>Each card has its dex's tick (<Check /> for Caught, a badge for the others) and, where switched on, stars and second-dex badges. Tap to tick, tap again to untick. See the <G to="icons">icon legend</G>.</li>
            <li>A shiny, Lucky, XXL, XXS or 100% tick also ticks Caught. Unticking Caught unticks them.</li>
            <li>With gender on, cards that come in both genders have a ♂ row and a ♀ row.</li>
            <li>A dotted checkmark means another form of the species is collected (in the In game view a species counts when any form is).</li>
            <li>Tap the picture or name to open the <G to="pokemon-pages">Pokémon page</G> with every form. On desktop, hovering a picture shows the shiny.</li>
          </ul>
          <h2>Search and filters</h2>
          <ul>
            <li><b>Search name</b>, or a dex number. <b>Search whole family</b> also finds the rest of its evolution family.</li>
            <li><b>Generation</b>, and switches for <b>Upcoming</b> (announced, not out yet) and <b>Unreleased</b> Pokémon.</li>
            <li><b>All / Missing / Collected</b>. Missing also shows what you've marked as wanted, and what's about to be released.</li>
            <li><b>In game / All forms</b> where All forms is switched on.</li>
          </ul>
          <p>The filters float at the top when you scroll; tap the slim bar to open them.</p>
          <h2>Check all / Uncheck all</h2>
          <p>Ticks or unticks every card in the current view, after filters. You choose which ticks (e.g. Collected, Shiny, XXS) and confirm by sliding. With gender on, both ♂ and ♀ are changed. Combine with the generation filter or a family search to change just a group.</p>
          <h2>Wanted</h2>
          <p>Switch on <b>Mark wanted</b>, then tap a ticked icon to mark it with a puzzle piece <span className="legend-icon want-legend"><PuzzleIcon /></span>: you have it but still want one (a better one, for trade…). Wanted Pokémon show under Missing and on your <G to="wishlists">wishlists</G>. Shadow and Purified can't be marked as wanted.</p>
        </>
      ),
      sv: (
        <>
          <h2>Sidan Dexar</h2>
          <p>En ruta per påslagen dex, med räknare och förloppsstapel; shiny och andra dexar (XXS, Purified) räknas i samma ruta. Tryck på en ruta för att öppna dexen. Med Alla former på har rutan en andra del för vyn Alla former. <b>Hela samlingen</b> visar alla dexar i en tabell (<G to="full-collection">guide</G>).</p>
          <h2>Bocka</h2>
          <ul>
            <li>Varje kort har dexens bock (<Check /> för Fångade, ett märke för de andra) och, där de är på, stjärnor och märken för andra dexar. Tryck för att bocka, tryck igen för att avbocka. Se <G to="icons">ikonförklaringen</G>.</li>
            <li>En shiny-, Lucky-, XXL-, XXS- eller 100%-bock bockar även Fångade. Att avbocka Fångade avbockar dem.</li>
            <li>Med kön på har kort som finns i båda könen en ♂-rad och en ♀-rad.</li>
            <li>En prickad bock betyder att en annan form av arten är samlad (i vyn I spelet räknas en art när någon form är det).</li>
            <li>Tryck på bilden eller namnet för att öppna <G to="pokemon-pages">Pokémon-sidan</G> med alla former. På datorn visar bilden shinyn när du för musen över den.</li>
          </ul>
          <h2>Sök och filter</h2>
          <ul>
            <li><b>Sök namn</b>, eller ett dexnummer. <b>Sök hela familjen</b> hittar även resten av evolutionsfamiljen.</li>
            <li><b>Generation</b>, och reglage för <b>Kommande</b> (annonserade, inte ute än) och <b>Ej släppta</b> Pokémon.</li>
            <li><b>Alla / Saknas / Insamlade</b>. Saknas visar även det du markerat som önskat, och det som snart släpps.</li>
            <li><b>I spelet / Alla former</b> där Alla former är på.</li>
          </ul>
          <p>Filtren svävar högst upp när du skrollar; tryck på den smala raden för att öppna dem.</p>
          <h2>Markera alla / Avmarkera alla</h2>
          <p>Bockar eller avbockar alla kort i den aktuella vyn, efter filter. Du väljer vilka bockar (t.ex. Insamlad, Shiny, XXS) och bekräftar genom att dra. Med kön på ändras både ♂ och ♀. Kombinera med generationsfiltret eller en familjesökning för att bara ändra en grupp.</p>
          <h2>Önskad</h2>
          <p>Slå på <b>Markera önskade</b> och tryck på en bockad ikon för att märka den med en pusselbit <span className="legend-icon want-legend"><PuzzleIcon /></span>: du har den men vill ändå ha en (en bättre, för byte…). Önskade Pokémon syns under Saknas och på dina <G to="wishlists">önskelistor</G>. Shadow och Purified kan inte markeras som önskade.</p>
        </>
      ),
    },
  },
  {
    slug: "icons",
    title: { en: "Icon legend", sv: "Ikonförklaring" },
    summary: { en: "What every mark means.", sv: "Vad varje markering betyder." },
    body: {
      en: <Legend lang="en" />,
      sv: <Legend lang="sv" />,
    },
  },
  {
    slug: "events",
    title: { en: "Events", sv: "Händelser" },
    summary: { en: "Current and upcoming events, raid bosses, and what you're missing from them.", sv: "Pågående och kommande händelser, raidbossar och vad du saknar från dem." },
    body: {
      en: (
        <>
          <p>The <Link href="/events">Events</Link> page lists Pokémon GO events from Leek Duck, updated daily. It's open to everyone.</p>
          <h2>What's on the page</h2>
          <ul>
            <li><b>Happening now</b>: events running right now (by your device's clock, in local time), with the Pokémon they feature, grouped as the event page lists them (spawns, raids, eggs, research…). A ✨ means it can be shiny.</li>
            <li><b>Raid bosses</b>: the current raid bosses by level, including Shadow raids.</li>
            <li><b>Upcoming events</b>: by date, with their names.</li>
            <li>The link icon opens the event on Leek Duck for all the details.</li>
          </ul>
          <h2>What am I missing?</h2>
          <p>Signed in, switch from <b>All</b> to <b>Missing</b>: each event then shows only the Pokémon you're missing, and next to each one the icons of the dexes it's missing from (with ♂/♀ where only one gender is missing).</p>
          <ul>
            <li>The <b>Dexes</b> menu chooses which dexes count, e.g. only Caught and Shiny. The choice is saved, separately from Full collection.</li>
            <li>Shadow and Purified only count for Pokémon the event lists as Shadow.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <p>Sidan <Link href="/events">Händelser</Link> listar Pokémon GO-händelser från Leek Duck, uppdaterat dagligen. Den är öppen för alla.</p>
          <h2>Vad som finns på sidan</h2>
          <ul>
            <li><b>Pågår nu</b>: händelser som pågår just nu (enligt din enhets klocka, i lokal tid), med de Pokémon de innehåller, grupperade som på händelsesidan (spawns, raider, ägg, uppdrag…). ✨ betyder att den kan vara shiny.</li>
            <li><b>Raidbossar</b>: nuvarande raidbossar per nivå, även Shadow-raider.</li>
            <li><b>Kommande händelser</b>: efter datum, med namn.</li>
            <li>Länkikonen öppnar händelsen på Leek Duck med alla detaljer.</li>
          </ul>
          <h2>Vad saknar jag?</h2>
          <p>Inloggad, växla från <b>Alla</b> till <b>Saknas</b>: varje händelse visar då bara Pokémon du saknar, och bredvid varje ikonerna för dexarna den saknas i (med ♂/♀ där bara ett kön saknas).</p>
          <ul>
            <li>Menyn <b>Dexar</b> väljer vilka dexar som räknas, t.ex. bara Fångade och Shiny. Valet sparas, separat från Hela samlingen.</li>
            <li>Shadow och Purified räknas bara för Pokémon som händelsen anger som Shadow.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "wishlists",
    title: { en: "Wishlists", sv: "Önskelistor" },
    summary: { en: "What's on each list, the in-game search phrase, and sharing.", sv: "Vad som finns på varje lista, sökfrasen i spelet och delning." },
    body: {
      en: (
        <>
          <p><Link href="/wishlists">Wishlists</Link> show what you're still missing, ready to send to trading partners.</p>
          <h2>What's on each list</h2>
          <ul>
            <li>Each list comes from one or two dexes: <b>Caught + Lucky</b>, <b>Shiny</b> (+ Shiny ⭐⭐⭐ if on), <b>XXS</b>, <b>XXL</b>, <b>Gigantamax</b>, <b>Dynamax</b>, <b>Costume/Event</b> and <b>Costume/Event shiny</b>. Only dexes you show are listed. On combined lists, an icon tells which dex each Pokémon is missing in.</li>
            <li>Only tradeable Pokémon are listed: mythicals and other Pokémon that can't be traded are left out.</li>
            <li>Pokémon you've ticked but marked as <b>wanted</b> on a dex page are listed too, e.g. when you want a better one.</li>
            <li>With <b>All forms</b> on for a dex, each missing form is listed; otherwise each missing species.</li>
            <li>With <b>gender</b> on, a Pokémon missing in one gender shows with ♂ or ♀.</li>
            <li><b>Show only lowest evolution</b> (public page only): each family shows only its lowest missing stage, since a trade partner's Pokémon can be evolved.</li>
          </ul>
          <h2>The search phrase</h2>
          <p>Under each list is a Pokémon GO search phrase, like <code>!traded&amp;1-3,25,133</code>. Tap it to copy, and send it to a trading partner: pasted into the search in their game, it shows the Pokémon on your list. Choose <b>EN</b> or <b>日本語</b> for the language of <i>their</i> game.</p>
          <p className="note">The game's search can't filter by gender, so the phrase finds both ♂ and ♀; the partner has to check the gender themselves.</p>
          <h2>Sharing</h2>
          <ul>
            <li>Switch on <b>Show in public</b> for the lists you want to share. They appear on your public page, <code>/user/&lt;your nickname&gt;</code>, which anyone can open without an account.</li>
            <li>Each tab has its own link (e.g. <code>#shiny</code>), so you can send a link straight to one list.</li>
            <li><b>Save as image</b> makes a picture of the list with the search phrase, to share in chats. Long lists are split into several pictures.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <p><Link href="/wishlists">Önskelistor</Link> visar vad du fortfarande saknar, redo att skicka till bytespartners.</p>
          <h2>Vad som finns på varje lista</h2>
          <ul>
            <li>Varje lista kommer från en eller två dexar: <b>Fångade + Lucky</b>, <b>Shiny</b> (+ Shiny ⭐⭐⭐ om på), <b>XXS</b>, <b>XXL</b>, <b>Gigantamax</b>, <b>Dynamax</b>, <b>Kostym/Event</b> och <b>Kostym/Event shiny</b>. Bara dexar du visar listas. På kombinerade listor visar en ikon vilken dex varje Pokémon saknas i.</li>
            <li>Bara Pokémon som kan bytas listas: mytiska och andra som inte kan bytas utelämnas.</li>
            <li>Pokémon du har bockat men markerat som <b>önskade</b> på en dexsida listas också, t.ex. när du vill ha en bättre.</li>
            <li>Med <b>Alla former</b> på för en dex listas varje saknad form; annars varje saknad art.</li>
            <li>Med <b>kön</b> på visas en Pokémon som saknas i ett kön med ♂ eller ♀.</li>
            <li><b>Visa bara lägsta utvecklingssteg</b> (bara publika sidan): varje familj visar bara sitt lägsta saknade steg, eftersom en bytespartners Pokémon kan utvecklas.</li>
          </ul>
          <h2>Sökfrasen</h2>
          <p>Under varje lista finns en sökfras för Pokémon GO, t.ex. <code>!traded&amp;1-3,25,133</code>. Tryck för att kopiera och skicka den till en bytespartner: inklistrad i sökningen i deras spel visar den Pokémon på din lista. Välj <b>EN</b> eller <b>日本語</b> efter språket i <i>deras</i> spel.</p>
          <p className="note">Spelets sökning kan inte filtrera på kön, så frasen hittar både ♂ och ♀; partnern får själv kolla könet.</p>
          <h2>Dela</h2>
          <ul>
            <li>Slå på <b>Visa publikt</b> för listorna du vill dela. De syns på din publika sida, <code>/user/&lt;ditt smeknamn&gt;</code>, som vem som helst kan öppna utan konto.</li>
            <li>Varje flik har en egen länk (t.ex. <code>#shiny</code>), så du kan skicka en länk direkt till en lista.</li>
            <li><b>Spara som bild</b> gör en bild av listan med sökfrasen, att dela i chattar. Långa listor delas upp i flera bilder.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "full-collection",
    title: { en: "Full collection", sv: "Hela samlingen" },
    summary: { en: "Every dex side by side in one table.", sv: "Alla dexar sida vid sida i en tabell." },
    body: {
      en: (
        <>
          <p><Link href="/full">Full collection</Link> (from the Dexes page) shows every switched-on dex as a column, one row per species.</p>
          <ul>
            <li>A filled dot is collected, a ring is missing, a striped cell means nothing is released for that dex.</li>
            <li>Dexes that count every form (Mega, Gigantamax, Dynamax, Costume/Event) show how many of the forms you have; with gender on, cells count ♂ and ♀.</li>
            <li>The <b>Dexes</b> menu hides columns you don't need; the choice is saved.</li>
            <li>Tap a name to open its <G to="pokemon-pages">Pokémon page</G>.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <p><Link href="/full">Hela samlingen</Link> (från sidan Dexar) visar varje påslagen dex som en kolumn, en rad per art.</p>
          <ul>
            <li>En fylld prick är samlad, en ring saknas, en randig ruta betyder att inget är släppt för den dexen.</li>
            <li>Dexar som räknar varje form (Mega, Gigantamax, Dynamax, Kostym/Event) visar hur många av formerna du har; med kön på räknas ♂ och ♀.</li>
            <li>Menyn <b>Dexar</b> döljer kolumner du inte behöver; valet sparas.</li>
            <li>Tryck på ett namn för att öppna <G to="pokemon-pages">Pokémon-sidan</G>.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "pokemon-pages",
    title: { en: "Pokémon pages", sv: "Pokémon-sidor" },
    summary: { en: "Every form of a species, with ticks, types, gender and evolutions.", sv: "Alla former av en art, med bockar, typer, kön och evolutioner." },
    body: {
      en: (
        <>
          <p>Tapping a Pokémon's picture or name opens its page: every form of the species, regular, regional, costumes, Mega…</p>
          <ul>
            <li>Each form shows its types, gender and release status, and the ticks of every dex it belongs to (<G to="icons">icon legend</G>). Tick right here, like on a dex page; <b>Mark wanted</b> works too.</li>
            <li>Tap a picture to see the shiny.</li>
            <li><b>Evolves from</b> and <b>Evolves into</b> show the family with candy costs and any extra requirement (an item, buddy distance, time of day…).</li>
            <li>The arrows go to the previous and next Pokémon by number.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <p>Att trycka på en Pokémons bild eller namn öppnar dess sida: alla former av arten, vanlig, regional, kostymer, Mega…</p>
          <ul>
            <li>Varje form visar typer, kön och släppstatus, och bockarna för varje dex den hör till (<G to="icons">ikonförklaring</G>). Bocka direkt här, som på en dexsida; <b>Markera önskade</b> fungerar också.</li>
            <li>Tryck på en bild för att se shinyn.</li>
            <li><b>Utvecklas från</b> och <b>Utvecklas till</b> visar familjen med godiskostnad och eventuella extra krav (ett föremål, buddy-sträcka, tid på dygnet…).</li>
            <li>Pilarna går till föregående och nästa Pokémon efter nummer.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "spreadsheet",
    title: { en: "Spreadsheet backup", sv: "Kalkylark" },
    summary: { en: "Download your whole collection, edit it, upload it again.", sv: "Ladda ner hela samlingen, ändra den, ladda upp den igen." },
    body: {
      en: (
        <>
          <p>Under <Link href="/settings">Settings → Spreadsheet</Link> you can download your whole collection as an .xlsx file (Excel, Google Sheets, Numbers), edit it and upload it again. It's also a handy backup. The file and the upload report are in English.</p>
          <h2>The file</h2>
          <ul>
            <li>The first tab, <b>Instructions</b>, explains everything below.</li>
            <li>Then one tab per dex group you show (Caught, Shiny, Lucky, XXL-XXS…), with a column per dex: e.g. <code>shadow</code>, <code>shadow_shiny</code>, <code>purified</code>, <code>purified_shiny</code>.</li>
            <li>One row per form, always every form. Where a dex tracks gender, a ♀ row follows the ♂ row.</li>
            <li>Fill in <b>TRUE</b> (ticked), <b>FALSE</b> or empty (not ticked), or <b>WANTED</b> (ticked and wanted).</li>
            <li>Cells left empty in the download (not released, or a ♀ row where that dex doesn't track gender) are ignored.</li>
          </ul>
          <h2>Uploading</h2>
          <ol>
            <li>Choose the file and press <b>Check file</b>. Nothing is saved yet.</li>
            <li>The summary shows, per tab and dex, what gets ticked, unticked and (no longer) wanted, and what the tick rules change on top (e.g. Caught ticked because of a Lucky tick).</li>
            <li>Cells that can't be used are listed per tab and row, with the reason; <b>Copy list</b> copies them so you can fix the file.</li>
            <li>Press <b>Save changes</b>, or <b>Cancel</b>.</li>
          </ol>
          <p>The rules are the same as in the app: a shiny needs its regular tick; Lucky, XXL, XXS and 100% need Caught; unticking a dex unticks what depends on it. Tabs or columns you delete leave those dexes as they are, and dexes you've switched off are never changed.</p>
        </>
      ),
      sv: (
        <>
          <p>Under <Link href="/settings">Inställningar → Kalkylark</Link> kan du ladda ner hela samlingen som en .xlsx-fil (Excel, Google Kalkylark, Numbers), ändra den och ladda upp den igen. Den fungerar också som säkerhetskopia. Filen och uppladdningsrapporten är på engelska.</p>
          <h2>Filen</h2>
          <ul>
            <li>Första fliken, <b>Instructions</b>, förklarar allt nedan.</li>
            <li>Sedan en flik per dexgrupp du visar (Caught, Shiny, Lucky, XXL-XXS…), med en kolumn per dex: t.ex. <code>shadow</code>, <code>shadow_shiny</code>, <code>purified</code>, <code>purified_shiny</code>.</li>
            <li>En rad per form, alltid alla former. Där en dex följer kön kommer en ♀-rad efter ♂-raden.</li>
            <li>Fyll i <b>TRUE</b> (bockad), <b>FALSE</b> eller tomt (inte bockad), eller <b>WANTED</b> (bockad och önskad).</li>
            <li>Rutor som är tomma i nedladdningen (inte släppt, eller en ♀-rad där dexen inte följer kön) ignoreras.</li>
          </ul>
          <h2>Ladda upp</h2>
          <ol>
            <li>Välj filen och tryck <b>Check file</b>. Inget sparas än.</li>
            <li>Sammanställningen visar, per flik och dex, vad som bockas, avbockas och (inte längre) är önskat, och vad bockreglerna ändrar utöver det (t.ex. Fångade bockad på grund av en Lucky-bock).</li>
            <li>Rutor som inte kan användas listas per flik och rad, med orsak; <b>Copy list</b> kopierar dem så att du kan rätta filen.</li>
            <li>Tryck <b>Save changes</b>, eller <b>Cancel</b>.</li>
          </ol>
          <p>Reglerna är desamma som i appen: en shiny behöver sin vanliga bock; Lucky, XXL, XXS och 100% behöver Fångade; att avbocka en dex avbockar det som hänger på den. Flikar eller kolumner du tar bort lämnar de dexarna orörda, och dexar du stängt av ändras aldrig.</p>
        </>
      ),
    },
  },
  {
    slug: "install",
    title: { en: "Install the app", sv: "Installera appen" },
    summary: { en: "Put RepDex on your Home Screen, like an app.", sv: "Lägg RepDex på hemskärmen, som en app." },
    body: {
      en: (
        <>
          <p>RepDex is a web app: install it from the browser, no app store needed. It then opens full screen with its own icon, and updates by itself.</p>
          <h2>iPhone and iPad</h2>
          <ol>
            <li>Open RepDex in <b>Safari</b>.</li>
            <li>Tap the <b>Share</b> button (the square with an arrow).</li>
            <li>Scroll down and tap <b>Add to Home Screen</b>, then <b>Add</b>.</li>
          </ol>
          <h2>Android</h2>
          <ol>
            <li>Open RepDex in <b>Chrome</b>.</li>
            <li>Tap the <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).</li>
          </ol>
          <h2>Computer</h2>
          <p>In Chrome or Edge, click the install icon at the right end of the address bar.</p>
        </>
      ),
      sv: (
        <>
          <p>RepDex är en webbapp: installera den från webbläsaren, ingen appbutik behövs. Den öppnas sedan i helskärm med egen ikon och uppdateras av sig själv.</p>
          <h2>iPhone och iPad</h2>
          <ol>
            <li>Öppna RepDex i <b>Safari</b>.</li>
            <li>Tryck på <b>Dela</b>-knappen (rutan med en pil).</li>
            <li>Skrolla ner och tryck <b>Lägg till på hemskärmen</b>, sedan <b>Lägg till</b>.</li>
          </ol>
          <h2>Android</h2>
          <ol>
            <li>Öppna RepDex i <b>Chrome</b>.</li>
            <li>Tryck på menyn <b>⋮</b> och sedan <b>Installera app</b> (eller <b>Lägg till på startskärmen</b>).</li>
          </ol>
          <h2>Dator</h2>
          <p>I Chrome eller Edge, klicka på installationsikonen längst till höger i adressfältet.</p>
        </>
      ),
    },
  },
  {
    slug: "sharing",
    title: { en: "Sharing and profile", sv: "Delning och profil" },
    summary: { en: "Your nickname, public wishlists and the link to send.", sv: "Ditt smeknamn, publika önskelistor och länken att skicka." },
    body: {
      en: (
        <>
          <ul>
            <li>Your <b>in-game nickname</b> (Settings) is your public name in RepDex. Use your Pokémon GO trainer name so trading partners recognise you.</li>
            <li>Your collection itself is private. Only the wishlists you switch to <b>Show in public</b> are shared.</li>
            <li>Your public page is <code>/user/&lt;nickname&gt;</code>; the link is at the top of your <Link href="/wishlists">Wishlists</Link> page. Add <code>#shiny</code>, <code>#xxs</code> and so on to link to one list.</li>
            <li>Or send a picture: <b>Save as image</b> on a wishlist.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <ul>
            <li>Ditt <b>smeknamn i spelet</b> (Inställningar) är ditt publika namn i RepDex. Använd ditt tränarnamn i Pokémon GO så att bytespartners känner igen dig.</li>
            <li>Själva samlingen är privat. Bara önskelistor du sätter till <b>Visa publikt</b> delas.</li>
            <li>Din publika sida är <code>/user/&lt;smeknamn&gt;</code>; länken står överst på sidan <Link href="/wishlists">Önskelistor</Link>. Lägg till <code>#shiny</code>, <code>#xxs</code> och så vidare för att länka till en lista.</li>
            <li>Eller skicka en bild: <b>Spara som bild</b> på en önskelista.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "start-page",
    title: { en: "Start page and release dates", sv: "Startsidan och släppdatum" },
    summary: { en: "Recent and upcoming releases, and what Upcoming and Unreleased mean.", sv: "Senaste och kommande släpp, och vad Kommande och Ej släppt betyder." },
    body: {
      en: (
        <>
          <ul>
            <li>The <Link href="/">start page</Link> lists what was released in the last 7 days and what's coming, by date: new Pokémon, shinies, Shadows, Dynamax… with any event starting that day.</li>
            <li>Release dates come from the Pokémon GO Wiki and Leek Duck, checked daily, and are reviewed by the RepDex admins.</li>
            <li><b>Upcoming</b> on a card: announced with a date, not out yet. It shows greyed with a green border and isn't counted until its date.</li>
            <li><b>Unreleased</b>: not in Pokémon GO yet, no date. Shown greyed for completeness, not counted.</li>
            <li>Battle-only forms (like Zen mode Darmanitan) are shown but can't be ticked.</li>
          </ul>
        </>
      ),
      sv: (
        <>
          <ul>
            <li><Link href="/">Startsidan</Link> listar vad som släppts de senaste 7 dagarna och vad som kommer, efter datum: nya Pokémon, shinies, Shadows, Dynamax… med eventuell händelse som börjar den dagen.</li>
            <li>Släppdatum kommer från Pokémon GO Wiki och Leek Duck, kontrolleras dagligen och granskas av RepDex-administratörerna.</li>
            <li><b>Kommande</b> på ett kort: annonserad med datum, inte ute än. Visas grå med grön kant och räknas inte förrän på datumet.</li>
            <li><b>Ej släppt</b>: finns inte i Pokémon GO än, inget datum. Visas grå för fullständighetens skull, räknas inte.</li>
            <li>Stridsformer (som Darmanitan i Zen-läge) visas men kan inte bockas.</li>
          </ul>
        </>
      ),
    },
  },
  {
    slug: "faq",
    title: { en: "FAQ", sv: "Vanliga frågor" },
    summary: { en: "Short answers to common questions.", sv: "Korta svar på vanliga frågor." },
    body: {
      en: (
        <dl className="faq">
          <dt>If I switch a dex off, are my ticks deleted?</dt>
          <dd>No. Switching a dex off only hides it; your ticks come back when you switch it on again.</dd>
          <dt>Why can't I tick some forms?</dt>
          <dd>Battle-only forms (Zen mode, Blade Forme, Hangry Mode…) can't be caught, and Pokémon that aren't released yet can't be ticked until their date.</dd>
          <dt>Why is a Pokémon missing from my wishlist?</dt>
          <dd>Wishlists only list Pokémon that can be traded; mythicals and other untradeable Pokémon are left out. "Show only lowest evolution" also hides later stages on your public page.</dd>
          <dt>What's the difference between Shiny and Shiny ⭐⭐⭐?</dt>
          <dd>Shiny is any shiny. Shiny ⭐⭐⭐ is a RepDex-only extra for shinies with perfect (3-star) stats.</dd>
          <dt>Why did ticking a Lucky also tick Caught?</dt>
          <dd>A Lucky (or XXL, XXS, 100%, shiny) Pokémon is a caught one, so Caught follows. Unticking Caught unticks them again.</dd>
          <dt>Why does a card show "Upcoming"?</dt>
          <dd>It's announced with a release date that hasn't come yet. It's counted from that date.</dd>
          <dt>The search phrase finds both genders. Why?</dt>
          <dd>Pokémon GO's search can't filter by gender. Check the gender by hand when trading.</dd>
          <dt>How do I back up my collection?</dt>
          <dd>Download the spreadsheet under Settings → Spreadsheet. Upload it again any time to restore or change ticks.</dd>
        </dl>
      ),
      sv: (
        <dl className="faq">
          <dt>Försvinner mina bockar om jag stänger av en dex?</dt>
          <dd>Nej. Att stänga av en dex döljer den bara; bockarna kommer tillbaka när du slår på den igen.</dd>
          <dt>Varför kan jag inte bocka vissa former?</dt>
          <dd>Stridsformer (Zen-läge, Blade Forme, Hangry Mode…) kan inte fångas, och Pokémon som inte släppts än kan inte bockas förrän på sitt datum.</dd>
          <dt>Varför saknas en Pokémon på min önskelista?</dt>
          <dd>Önskelistor tar bara med Pokémon som kan bytas; mytiska och andra som inte kan bytas utelämnas. "Visa bara lägsta utvecklingssteg" döljer också senare steg på din publika sida.</dd>
          <dt>Vad är skillnaden mellan Shiny och Shiny ⭐⭐⭐?</dt>
          <dd>Shiny är vilken shiny som helst. Shiny ⭐⭐⭐ är ett extra i RepDex för shinies med perfekta (3-stjärniga) värden.</dd>
          <dt>Varför bockades Fångade när jag bockade en Lucky?</dt>
          <dd>En Lucky- (eller XXL-, XXS-, 100%-, shiny-) Pokémon är fångad, så Fångade följer med. Att avbocka Fångade avbockar dem igen.</dd>
          <dt>Varför står det "Kommande" på ett kort?</dt>
          <dd>Den är annonserad med ett släppdatum som inte kommit än. Den räknas från det datumet.</dd>
          <dt>Sökfrasen hittar båda könen. Varför?</dt>
          <dd>Sökningen i Pokémon GO kan inte filtrera på kön. Kolla könet för hand när ni byter.</dd>
          <dt>Hur säkerhetskopierar jag min samling?</dt>
          <dd>Ladda ner kalkylarket under Inställningar → Kalkylark. Ladda upp det igen när som helst för att återställa eller ändra bockar.</dd>
        </dl>
      ),
    },
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);

/** Every mark in RepDex, with what it means. */
function Legend({ lang }: { lang: "en" | "sv" }) {
  const sv = lang === "sv";
  const row = (icon: ReactNode, text: string) => <li>{icon}{text}</li>;
  const badge = (k: Parameters<typeof BadgeIcon>[0]["kind"], extra = "") => <span className={`badge legend-icon ${extra}`}><BadgeIcon kind={k} size={20} /></span>;
  return (
    <div className="guide-legend">
      <h2>{sv ? "Bockar" : "Ticks"}</h2>
      <ul>
        {row(<Check />, sv ? "Fångad (bocken i Fångade)" : "Caught (the Caught checkmark)")}
        {row(<span className="star legend-icon on"><StarIcon kind="star" size={20} /></span>, sv ? "Shiny; på andra dexar: den dexens shiny" : "Shiny; on other dexes: that dex's shiny")}
        {row(<span className="star legend-icon on"><StarIcon kind="star3" size={20} /></span>, sv ? "Shiny ⭐⭐⭐ (3-stjärnig shiny, bara i RepDex)" : "Shiny ⭐⭐⭐ (3-star shiny, RepDex only)")}
        {row(badge("lucky"), "Lucky")}
        {row(badge("xxl", "xxl"), "XXL")}
        {row(badge("xxs", "xxs"), "XXS")}
        {row(badge("perfect"), sv ? "100% (perfekta värden)" : "100% (perfect stats)")}
        {row(badge("shadow"), "Shadow")}
        {row(badge("shadow_shiny"), "Shadow shiny")}
        {row(badge("purified"), "Purified")}
        {row(badge("purified_shiny"), "Purified shiny")}
        {row(badge("mega"), "Mega")}
        {row(badge("mega_shiny"), "Mega shiny")}
        {row(badge("gigantamax"), "Gigantamax")}
        {row(badge("gigantamax_shiny"), "Gigantamax shiny")}
        {row(badge("dynamax"), "Dynamax")}
        {row(badge("dynamax_shiny"), "Dynamax shiny")}
      </ul>
      <p className="note">{sv ? "Bleka ikoner är inte bockade än." : "Faded icons aren't ticked yet."}</p>
      <h2>{sv ? "Övrigt" : "Other marks"}</h2>
      <ul>
        {row(<span className="legend-icon want-legend"><PuzzleIcon /></span>, sv ? "Önskad: du har den men vill ha en till (syns på önskelistor)" : "Wanted: you have it but want another (shows on wishlists)")}
        {row(<span className="legend-icon forbid" aria-hidden="true" />, sv ? "Inte släppt än, kan inte bockas" : "Not released yet, can't be ticked")}
        <li><span className="legend-icon g-sign m">♂</span><span className="legend-icon g-sign f">♀</span>{sv ? "Hane / hona, där du bockar könen var för sig" : "Male / female, where you tick genders separately"}</li>
        <li><span className="not-in-game small">{sv ? "Inte i spelet" : "Not in game"}</span>{sv ? "Dexen finns inte i Pokémon GO, bara i RepDex (Dynamax, Kostym/Event, Shiny ⭐⭐⭐)" : "The dex doesn't exist in Pokémon GO, only in RepDex (Dynamax, Costume/Event, Shiny ⭐⭐⭐)"}</li>
        <li><span className="legend-icon">◌</span>{sv ? "Prickad bock: en annan form av arten är samlad" : "Dotted checkmark: another form of the species is collected"}</li>
        <li><span className="legend-icon">✨</span>{sv ? "Händelser: kan vara shiny" : "Events: can be shiny"}</li>
      </ul>
    </div>
  );
}
