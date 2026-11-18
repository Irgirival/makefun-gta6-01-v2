// talkradio.js — Solmar Sports & Traffic 98.2 and the crime-reactive talk
// show (v6). A fourth station joins the dial: live sports calls, traffic
// reports from the city's helicopter, and a talk show whose host follows
// Mara's rap sheet in real time — the more stars she carries, the hotter
// the segment gets. The bulletin system in radio.js calls into here
// whenever the wanted level changes.

const HOST_LINES = {
  calm: [
    'HOST DANA: "Quiet night on the avenues, Solmar. Enjoy it — it never lasts."',
    'HOST DANA: "Traffic is moving, the trams are on time, and nobody has stolen a bus today."',
    'HOST DANA: "Caller, you\'re on Talk Solmar — yes, the cathedral bells are back. Beautiful, aren\'t they?"',
  ],
  warm: [
    'HOST DANA: "We\'ve got a driver out there in a hurry — the PD has eyes on the avenue. Slow down, whoever you are."',
    'HOST DANA: "Two stars over downtown, folks. Somebody\'s evening just got expensive."',
    'HOST DANA: "Traffic report: avoid the plaza, there\'s a chase forming and the cruisers are not joking."',
  ],
  hot: [
    'HOST DANA: "FOUR STARS, Solmar! The air unit is up and the whole PD is rolling. Who IS this driver?!"',
    'HOST DANA: "Caller says the driver is a woman in a borrowed jacket — Solmar, if you know Mara Solano, do NOT call in."',
    'HOST DANA: "The Guard has been mentioned on the scanner, people. If you see an armored truck, get off the road."',
  ],
  max: [
    'HOST DANA: "FIVE STARS — the National Guard is on the street! This is not a drill, this is a legend being made live!"',
    'HOST DANA: "The APC just rolled through the plaza and the phones are melting. Mara Solano, wherever you are — the city is watching."',
    'HOST DANA: "I have never seen Solmar like this. Stay inside, lock up, and whatever you do — do not get in her way."',
  ],
};

const SPORTS_LINES = [
  'PLAY-BY-PLAY: "Solano rounds the plaza bend — she is FLYING down the avenue!"',
  'PLAY-BY-PLAY: "The Vortex GT takes the corner on two wheels and the crowd goes wild!"',
  'PLAY-BY-PLAY: "And the underdog from Old Town takes the lead — what a night at the Verde GP!"',
  'PLAY-BY-PLAY: "The mountain run is on — snow on the road, nerves of steel, and a lodge full of witnesses."',
];

const TRAFFIC_LINES = [
  'TRAFFIC: "The old avenue tram is running five minutes late — blame the market crowds, not the driver."',
  'TRAFFIC: "Harbor Gate is clear, the bridge to Isla Verde is moving, and the beach road is a dream."',
  'TRAFFIC: "Expect delays near the cathedral — a film crew is shooting the plaza again. No, not that film crew."',
  'TRAFFIC: "The mountain road is open but slick — snow chains recommended, courage required."',
];

export function createTalkRadio(G) {
  const talk = {
    lastCrimeReport: -999,
    lastTrafficReport: -999,
    lastSportsCall: -999,
    reportCount: 0,
    sportsCount: 0,
  };
  G.talkradio = talk;
  return talk;
}

function pickLine(G, lines) {
  return lines[Math.floor(G.rng() * lines.length)];
}

export function talkCrimeLine(G) {
  const stars = G.wanted ? G.wanted.stars : 0;
  const bucket = stars >= 5 ? 'max' : stars >= 3 ? 'hot' : stars >= 1 ? 'warm' : 'calm';
  return pickLine(G, HOST_LINES[bucket]);
}

export function talkTrafficLine(G) {
  return pickLine(G, TRAFFIC_LINES);
}

export function talkSportsLine(G) {
  return pickLine(G, SPORTS_LINES);
}

// Called by the radio bulletin clock: the talk show reacts to the heat.
export function talkCrimeReport(G) {
  const t = G.talkradio;
  if (!t) return null;
  t.reportCount++;
  t.lastCrimeReport = G.elapsed;
  const line = talkCrimeLine(G);
  G.hud.showDialogue([line]);
  if (G.audio.bulletinSting) G.audio.bulletinSting();
  return line;
}

export function updateTalkRadio(G, dt) {
  const t = G.talkradio;
  if (!t) return;
  const station = G.radio ? G.radio.station() : null;
  if (!station) return;
  // On the sports station, a play-by-play call cuts in every minute.
  if (station.id === 'sports' && G.elapsed - t.lastSportsCall > 60) {
    t.lastSportsCall = G.elapsed;
    t.sportsCount++;
    G.hud.showDialogue([talkSportsLine(G)]);
    return;
  }
  // On the talk station, a traffic report cuts in every 75 seconds.
  if (station.id === 'talk' && G.elapsed - t.lastTrafficReport > 75) {
    t.lastTrafficReport = G.elapsed;
    G.hud.showDialogue([talkTrafficLine(G)]);
  }
}

export function talkradioSummary(G) {
  const t = G.talkradio;
  if (!t) return 'Talk radio — off air.';
  return `Talk radio: ${t.reportCount} crime reports · ${t.sportsCount} sports calls`;
}

// v7: the delivery desk, the season desk and the dog desk — three new
// line banks for Host Dana, because the city got three new things to
// talk about. The delivery desk follows the parcel streak, the season
// desk follows the race table, and the dog desk follows the K9 unit.
// The bulletin system picks the bank that matches whatever Mara did
// most recently, so the radio sounds like it is actually watching her.

const DELIVERY_LINES = [
  'HOST DANA: "Solmar Express has a new name on the board — a courier in a red jacket, and the parcels are arriving early."',
  'HOST DANA: "Three clean drops in a row, Solmar. The dispatcher is calling her the reliable one. Imagine that."',
  'HOST DANA: "A fragile box made it across the whole city without a scratch. Somebody out there drives like they care."',
];

const SEASON_LINES = [
  'HOST DANA: "Season 2, Solmar! The Mountain Pass is open, the Night Market Dash is lit, and the points table is a fistfight."',
  'HOST DANA: "Rosa says the new circuits favour the brave. The brave, she says, wear red jackets."',
  'HOST DANA: "The Verde GP Hour has the season table — and the woman at the top of it is not slowing down."',
];

const K9_LINES = [
  'HOST DANA: "The PD has a new officer, Solmar — four legs, no badge, and it runs faster than any cruiser on the force."',
  'HOST DANA: "Caller says the K9 unit just missed her by a whisker on the beach road. The dog, folks, is not joking."',
  'HOST DANA: "If you hear barking on the avenue, get out of the way. The dog is working, and the dog is fast."',
];

const MARKET_LINES = [
  'HOST DANA: "The Night Market is open and the plaza smells like spice, fish and fresh bread. Go hungry, leave happy."',
  'HOST DANA: "The fortune teller in Old Town says the city belongs to whoever keeps driving like they mean it. Make of that what you will."',
  'HOST DANA: "The food trucks at the harbor gate are doing a roaring trade — the taco truck has a line around the block."',
];

export function talkDeliveryLine(G) {
  const d = G.delivery;
  if (!d || d.done === 0) return null;
  return DELIVERY_LINES[Math.floor(G.rng() * DELIVERY_LINES.length)];
}

export function talkSeasonLine(G) {
  const s2 = G.season2;
  if (!s2 || s2.rounds === 0) return null;
  return SEASON_LINES[Math.floor(G.rng() * SEASON_LINES.length)];
}

export function talkK9Line(G) {
  const k9 = G.k9;
  if (!k9 || (!k9.active && k9.captures === 0)) return null;
  return K9_LINES[Math.floor(G.rng() * K9_LINES.length)];
}

export function talkMarketLine(G) {
  return MARKET_LINES[Math.floor(G.rng() * MARKET_LINES.length)];
}

// v7: the desk picker — one function the bulletin timer calls, which
// returns the most relevant line for whatever Mara just did.
export function talkV7Line(G) {
  if (G.k9 && G.k9.active) return talkK9Line(G);
  if (G.delivery && G.delivery.active) return talkDeliveryLine(G);
  if (G.season2 && G.season2.rounds > 0) return talkSeasonLine(G);
  if (G.cityV7 && G.cityV7.marketOn) return talkMarketLine(G);
  return null;
}

// ---- v8: the talk lines that know the story ------------------------------------
// The v7 talk lines covered deliveries, season 2, the K9 unit and the
// market; v8 adds the lines for the finale, the highway, the weather
// fronts and the achievements — the hosts finally talk about what Mara
// actually did, because the whole city heard about it.

const FINALE_LINES_V8 = [
  'Talk Solmar: the Meridian Trust is on the front page, and the plaza fountain has flowers on it. Draw your own conclusions.',
  'Talk Solmar: they say Mara Solano walked into the courthouse at sunrise and the city has not stopped talking since.',
  'Talk Solmar: the Trust\'s auditors are auditing each other now. Beautiful, really.',
];

const HIGHWAY_LINES_V8 = [
  'Talk Solmar: the north highway jammed again — three cars, one fender, and a whole afternoon of horns.',
  'Talk Solmar: the traffic chopper says the highway is flowing. Enjoy it while it lasts.',
];

const FRONT_LINES_V8 = [
  'Talk Solmar: a cold front crossed the city and the lightning put on a show. The gulls did not approve.',
  'Talk Solmar: rainbow over the bay this morning. The photographers are insufferable and the pictures are gorgeous.',
];

const MEDAL_LINES_V8 = [
  'Talk Solmar: Mara Solano has another medal on the shelf. At this rate the safehouse needs a bigger wall.',
  'Talk Solmar: thirty medals, six families, one Mara. The city is keeping count.',
];

export function talkFinaleLineV8(G) {
  return FINALE_LINES_V8[Math.floor(G.rng() * FINALE_LINES_V8.length)];
}

export function talkHighwayLineV8(G) {
  return HIGHWAY_LINES_V8[Math.floor(G.rng() * HIGHWAY_LINES_V8.length)];
}

export function talkFrontLineV8(G) {
  return FRONT_LINES_V8[Math.floor(G.rng() * FRONT_LINES_V8.length)];
}

export function talkMedalLineV8(G) {
  return MEDAL_LINES_V8[Math.floor(G.rng() * MEDAL_LINES_V8.length)];
}

// The host picks the freshest story: the finale first, then the jam,
// then the front, then the medals, then the old lines the show already
// had. The city talks about what happened, not what might.
export function talkV8Line(G) {
  if (G.missions5 && G.missions5.finaleDone) return talkFinaleLineV8(G);
  if (G.trafficV8 && G.trafficV8.jams.length > 0) return talkHighwayLineV8(G);
  if (G.weatherV8 && (G.weatherV8.frontActive || G.weatherV8.rainbowTimer > 0)) return talkFrontLineV8(G);
  if (G.achievements && G.achievements.unlocked.length >= 5) return talkMedalLineV8(G);
  return null;
}

export function talkradioV8Summary(G) {
  const line = talkV8Line(G);
  return line ? `Talk Solmar now: ${line}` : 'Talk Solmar: the hosts are on the old lines today.';
}
