// radio2.js — radio v2: the news that reacts to the story. The v7
// talk lines were static pools; v8's news desk reads the live game
// state — missions finished, races won, the weather forecast, the
// highway jam, the K9 captures — and writes the bulletin to match. After
// the finale, the whole tone changes: the Trust is on the front page,
// Mara is a folk hero, and the traffic report mentions the sunrise
// ceremony. The request line takes a dedication from a caller, and the
// station ident changes with the time of day, so the radio never sounds
// like a recording twice.

const NEWS_TEMPLATES = {
  story: (done) => `Solmar News: Mara Solano has finished ${done} of 16 missions. The harbor board says the city has never been quieter.`,
  finale: () => 'Solmar News: the Meridian Trust is on the front page this morning — and Mara Solano is a folk hero at the plaza fountain.',
  race: (wins) => `Solmar Sports: ${wins} race win${wins === 1 ? '' : 's'} for Mara Solano this season. The bookies have stopped taking bets against her.`,
  weatherFront: () => 'Solmar Weather: a cold front is crossing the city. Heavy rain under the band, lightning possible — stay off the beach road.',
  rainbow: () => 'Solmar Weather: the front has passed and a rainbow is arcing over the bay. The photographers are already out.',
  jam: (jams, chained) => `Solmar Traffic: the north highway is jammed — ${jams} jam${jams === 1 ? '' : 's'}, ${chained} chained. Take the avenue instead.`,
  k9: (captures) => `Solmar PD: the K9 unit has made ${captures} capture${captures === 1 ? '' : 's'} this week. The dog is getting a medal. Probably.`,
  delivery: (done) => `Solmar Business: Solmar Express has delivered ${done} parcels and counting. The dispatcher says Mara is the best courier they have ever had.`,
  garage: (hp) => `Solmar Motors: a dyno pull just read ${hp} horsepower at Vic's garage. The harbor can hear it from here.`,
  quiet: () => 'Solmar News: a quiet morning in the city. The fountain is running, the market is open, and the gulls own the harbor.',
};

const CALLER_NAMES = ['Rosa from Old Town', 'Benny from the harbor', 'Tasha from downtown', 'Old Man Ruiz', 'Lena (off the record)'];
const DEDICATIONS = [
  'wants this one for everyone stuck in the highway jam',
  'dedicates this to the K9 unit — good dog',
  'says this song is for the sunrise at the plaza',
  'wants it loud for the whole night market',
  'dedicates it to Mara, wherever she is driving tonight',
];

const STATION_IDENTS = {
  morning: 'Solmar FM — good morning, city. Coffee is on, the roads are yours.',
  noon: 'Solmar FM — midday in the city. The market is loud and the bay is blue.',
  evening: 'Solmar FM — evening drive. The lights are coming on downtown.',
  night: 'Solmar FM — after dark. The city belongs to the night owls now.',
};

function timeOfDayIdent(G) {
  const h = Math.floor((G.clockMinutes % (24 * 60)) / 60);
  if (h >= 5 && h < 11) return STATION_IDENTS.morning;
  if (h >= 11 && h < 17) return STATION_IDENTS.noon;
  if (h >= 17 && h < 22) return STATION_IDENTS.evening;
  return STATION_IDENTS.night;
}

export function createRadioV8(G) {
  if (G.radioV8) return G.radioV8;
  G.radioV8 = {
    bulletins: 0,
    lastBulletinAt: 0,
    lastTopic: 'quiet',
    dedications: 0,
    idents: 0,
    headlines: [],
  };
  return G.radioV8;
}

// Pick the news the city actually deserves right now: the finale first,
// then the freshest big number, then the weather, then the quiet line.
export function newsBulletinV8(G, force = false) {
  const r8 = G.radioV8;
  if (!r8) return null;
  const now = G.elapsed;
  if (!force && now - r8.lastBulletinAt < 75) return null;
  r8.lastBulletinAt = now;
  let topic = 'quiet';
  let line = NEWS_TEMPLATES.quiet();
  if (G.missions5 && G.missions5.finaleDone) {
    topic = 'finale';
    line = NEWS_TEMPLATES.finale();
  } else if (G.trafficV8 && G.trafficV8.jams.length > 0) {
    topic = 'jam';
    const t8 = G.trafficV8;
    line = NEWS_TEMPLATES.jam(t8.jams.length, t8.chainsTotal);
  } else if (G.weatherV8 && G.weatherV8.frontActive) {
    topic = 'weatherFront';
    line = NEWS_TEMPLATES.weatherFront();
  } else if (G.weatherV8 && G.weatherV8.rainbowTimer > 0) {
    topic = 'rainbow';
    line = NEWS_TEMPLATES.rainbow();
  } else if (G.k9 && G.k9.captures > 0) {
    topic = 'k9';
    line = NEWS_TEMPLATES.k9(G.k9.captures);
  } else if (G.delivery && G.delivery.done >= 5) {
    topic = 'delivery';
    line = NEWS_TEMPLATES.delivery(G.delivery.done);
  } else if (G.races && G.races.ladder.wins >= 3) {
    topic = 'race';
    line = NEWS_TEMPLATES.race(G.races.ladder.wins);
  } else if (G.garageV8 && G.garageV8.dyno.bestHp > 0) {
    topic = 'garage';
    line = NEWS_TEMPLATES.garage(G.garageV8.dyno.bestHp);
  } else if (G.missions.index >= 3) {
    topic = 'story';
    line = NEWS_TEMPLATES.story(G.missions.index);
  }
  r8.bulletins += 1;
  r8.lastTopic = topic;
  r8.headlines.push(line);
  if (r8.headlines.length > 6) r8.headlines.shift();
  G.hud.toast(`📻 ${line}`);
  return line;
}

export function radioRequestV8(G) {
  const r8 = G.radioV8;
  if (!r8) return null;
  const caller = CALLER_NAMES[Math.floor(G.rng() * CALLER_NAMES.length)];
  const dedication = DEDICATIONS[Math.floor(G.rng() * DEDICATIONS.length)];
  r8.dedications += 1;
  const line = `Caller ${caller} ${dedication}.`;
  G.hud.toast(`📻 ${line}`);
  return line;
}

export function radioIdentV8(G) {
  const r8 = G.radioV8;
  if (!r8) return null;
  const line = timeOfDayIdent(G);
  r8.idents += 1;
  G.hud.toast(`📻 ${line}`);
  return line;
}

// The news ticker: the last six headlines, newest first, for the pause
// screen and the end screen. The city writes its own history here.
export function newsTickerV8(G) {
  const r8 = G.radioV8;
  if (!r8 || r8.headlines.length === 0) return 'No headlines yet — the city is still waking up.';
  return [...r8.headlines].reverse().join(' | ');
}

export function updateRadioV8(G, dt) {
  const r8 = G.radioV8;
  if (!r8) return;
  // The news desk checks in every minute of game time; a bulletin only
  // goes out when something actually happened, or every 75 seconds.
  if (G.elapsed - r8.lastBulletinAt >= 75) newsBulletinV8(G, true);
}

export function radioV8Summary(G) {
  const r8 = G.radioV8;
  if (!r8) return 'Radio v2 not on air yet.';
  return `${r8.bulletins} bulletins · last topic: ${r8.lastTopic} · ${r8.dedications} dedications · ${r8.idents} station idents.`;
}
