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
