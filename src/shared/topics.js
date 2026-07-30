// Taksonomia „baniek informacyjnych" + lekki klasyfikator lokalny.
//
// Cel: z tego, co użytkownik REALNIE czyta (a to przechwytujemy), pokazać jego
// dietę informacyjną — które tematy dominują i, co ważniejsze, których w ogóle
// nie tyka (martwe pola). Klasyfikacja jest heurystyczna (słowa kluczowe), bez
// modelu i bez sieci — działa od razu na historii, nic nie wychodzi z urządzenia.
//
// ŚWIADOMIE bez nachylenia politycznego (lewica/prawica): rzetelne wykrycie
// wymaga modelu, a słowami kluczowymi tylko byśmy krzywdząco etykietowali.
//
// UWAGA: to NIE jest moduł ES – patrz komentarz w catalog.js.

(() => {
  "use strict";

  // Stała lista dziedzin życia. Zamknięta z rozmysłem: bez niej „czego NIE
  // czytasz" nie ma sensu — martwe pola liczymy właśnie względem tej listy.
  const TOPICS = [
    { id: "sport", emoji: "⚽", pl: "Sport", en: "Sport", hue: 145,
      kw: ["sport","mecz","piłk","liga","gol","bramk","tenis","siatków","koszyków","zawodnik","turniej","mistrzost","football","match","goal","nba","league","player","tournament","olimp"] },
    { id: "politics", emoji: "🏛️", pl: "Polityka", en: "Politics", hue: 25,
      kw: ["polityk","wybor","rząd","prezydent","sejm","senat","parti","minister","ustaw","premier","koalicj","opozycj","election","government","senate","policy","president","parliament","vote","coalition"] },
    { id: "tech", emoji: "💻", pl: "Technologia", en: "Technology", hue: 260,
      kw: ["technolog","sztuczn","ai ","oprogramowani","aplikacj","komputer","internet","smartfon","software","startup","algorytm","dane","programowan","tech","gadżet","chip","robot","machine learning","data","coding","app"] },
    { id: "business", emoji: "💼", pl: "Biznes i gospodarka", en: "Business & economy", hue: 210,
      kw: ["gospodark","ekonom","giełd","firm","biznes","inflacj","rynek","waluta","bank","podatk","inwestycj","economy","business","market","stock","finance","company","inflation","invest","trade"] },
    { id: "health", emoji: "🩺", pl: "Zdrowie", en: "Health", hue: 0,
      kw: ["zdrow","chorob","lekarz","medycyn","diet","szczepion","szpital","wirus","leczeni","psych","health","disease","medical","doctor","vaccine","hospital","therapy","mental","nutrition"] },
    { id: "science", emoji: "🔬", pl: "Nauka", en: "Science", hue: 190,
      kw: ["nauk","badani","fizyk","chemi","kosmos","astronom","biolog","matematyk","odkryci","science","research","physics","space","biology","study","experiment","quantum","genetic"] },
    { id: "travel", emoji: "✈️", pl: "Podróże", en: "Travel", hue: 175,
      kw: ["podróż","wakacj","turyst","hotel","lot ","wycieczk","zwiedza","plaż","travel","tourism","vacation","flight","trip","destination","itinerary","backpack"] },
    { id: "culture", emoji: "🎨", pl: "Kultura i sztuka", en: "Culture & arts", hue: 300,
      kw: ["film","muzyk","książk","sztuk","teatr","kultur","malarstw","koncert","literatur","movie","music","book","art","culture","theatre","novel","album","exhibition","festival"] },
    { id: "society", emoji: "🌍", pl: "Świat i społeczeństwo", en: "World & society", hue: 90,
      kw: ["bied","ubóstw","prawa człowiek","migracj","uchodź","rozwój","humanitar","nierówn","społeczn","wojn","konflikt","poverty","human rights","migration","refugee","inequality","development","humanitarian","war","conflict"] },
    { id: "environment", emoji: "🌱", pl: "Środowisko", en: "Environment", hue: 130,
      kw: ["klimat","środowisk","ekolog","emisj","zanieczyszcz","odnawialn","recykling","climate","environment","ecology","emission","pollution","renewable","sustainab","carbon"] },
    { id: "entertainment", emoji: "🎮", pl: "Rozrywka", en: "Entertainment", hue: 330,
      kw: ["gr","celebryt","plotk","serial","gwiazd","rozrywk","memy","gaming","celebrity","gossip","entertainment","netflix","tv show","stream","viral","meme"] },
    { id: "food", emoji: "🍳", pl: "Jedzenie", en: "Food", hue: 40,
      kw: ["przepis","gotowan","kuchni","restauracj","potraw","ciast","danie","recipe","cooking","cuisine","restaurant","dish","baking","meal","ingredient"] },
    { id: "lifestyle", emoji: "🏡", pl: "Styl życia", en: "Lifestyle", hue: 55,
      kw: ["moda","uroda","dom ","wnętrz","relacj","związek","rodzin","poradnik","fashion","beauty","home","lifestyle","relationship","family","wellness","hobby"] },
  ];

  const byId = new Map(TOPICS.map((t) => [t.id, t]));

  function norm(s) {
    return " " + String(s || "").toLowerCase().replace(/\s+/g, " ") + " ";
  }

  /**
   * Klasyfikuje tekst do JEDNEJ bańki (najwięcej trafień słów kluczowych).
   * Zwraca { id, score } albo null, gdy nic nie pasuje (temat nierozpoznany).
   */
  function classify(text) {
    const hay = norm(text);
    let best = null;
    for (const topic of TOPICS) {
      let score = 0;
      for (const k of topic.kw) if (hay.includes(k)) score++;
      if (score > 0 && (!best || score > best.score)) best = { id: topic.id, score };
    }
    return best;
  }

  /**
   * Agreguje listę tekstów w bańki. Zwraca:
   *  - bubbles: [{...topic, count, share}] posortowane malejąco (tylko >0),
   *  - blind:   [topic] kategorie bez ani jednego trafienia (martwe pola),
   *  - unknown: ile tekstów bez rozpoznanego tematu,
   *  - total:   ile sklasyfikowanych.
   */
  function aggregate(texts) {
    const counts = new Map();
    let unknown = 0;
    for (const txt of texts || []) {
      const hit = classify(txt);
      if (!hit) { unknown++; continue; }
      counts.set(hit.id, (counts.get(hit.id) || 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const bubbles = [...counts.entries()]
      .map(([id, count]) => ({ ...byId.get(id), count, share: total ? count / total : 0 }))
      .sort((a, b) => b.count - a.count);
    const blind = TOPICS.filter((t) => !counts.has(t.id));
    return { bubbles, blind, unknown, total };
  }

  function label(topic, lang) {
    return (lang === "pl" ? topic.pl : topic.en) || topic.en;
  }

  globalThis.KRYTYKAI_TOPICS = { TOPICS, classify, aggregate, label };
})();
