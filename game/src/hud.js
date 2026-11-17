// hud.js — the 2D overlay: health/armor bars, cash, wanted stars, clock,
// mission objective, dialogue lines, toasts, damage flash and the interact
// prompt. All DOM; the 3D scene never touches these elements directly.

import { nitroStatusText } from './nitro.js';

export function createHud(G) {
  const $ = (id) => document.getElementById(id);
  const hud = {
    root: $('hud'),
    stars: $('stars'),
    cash: $('cash'),
    clock: $('clock'),
    wantedLabel: $('wantedLabel'),
    weatherLabel: $('weatherLabel'),
    mTitle: $('mTitle'),
    mText: $('mText'),
    mHint: $('mHint'),
    healthFill: $('healthFill'),
    armorFill: $('armorFill'),
    weaponBox: $('weaponBox'),
    speed: $('speed'),
    crosshair: $('crosshair'),
    dialogue: $('dialogue'),
    toastEl: $('toast'),
    damage: $('damage'),
    interact: $('interact'),
    toastTimer: 0,
    dialogueTimer: 0,

    show() { this.root.classList.remove('hidden'); },
    hide() { this.root.classList.add('hidden'); },

    setMission(title, text, hint = '') {
      this.mTitle.textContent = title;
      this.mText.textContent = text;
      this.mHint.textContent = hint;
    },
    setObjectiveHint(hint) { this.mHint.textContent = hint; },

    showDialogue(lines) {
      const html = lines.map((l) => {
        const i = l.indexOf(':');
        if (i > 0) return `<span class="who">${l.slice(0, i)}:</span>${l.slice(i + 1)}`;
        return l;
      }).join('<br>');
      this.dialogue.innerHTML = html;
      this.dialogue.classList.remove('hidden');
      this.dialogueTimer = Math.max(4, lines.length * 2.6);
    },

    toast(text) {
      this.toastEl.textContent = text;
      this.toastTimer = 3.2;
    },

    flashDamage() {
      this.damage.style.opacity = '1';
      setTimeout(() => { this.damage.style.opacity = '0'; }, 130);
    },

    setInteract(text) {
      if (text) {
        this.interact.innerHTML = text;
        this.interact.classList.remove('hidden');
      } else {
        this.interact.classList.add('hidden');
      }
    },

    update(G, dt) {
      // Stars: filled gold for the current wanted level, dim for the rest.
      let starsHtml = '';
      for (let i = 0; i < 5; i++) {
        starsHtml += i < G.wanted.stars ? '★' : '<span class="off">★</span>';
      }
      this.stars.innerHTML = starsHtml;
      this.wantedLabel.textContent = G.wanted.stars > 0
        ? (G.wanted.stars >= 3 ? 'SOLMAR PD — ALL UNITS' : 'WANTED')
        : '';
      this.cash.textContent = `$${Math.floor(G.cash).toLocaleString('en-US')}`;
      const mins = Math.floor(G.clockMinutes) % (24 * 60);
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');
      this.clock.textContent = `${hh}:${mm}`;
      // Time of day + weather, under the clock.
      const tod = mins >= 300 && mins < 420 ? 'Dawn'
        : mins >= 420 && mins < 1020 ? 'Day'
        : mins >= 1020 && mins < 1140 ? 'Dusk'
        : mins >= 1140 && mins < 1380 ? 'Night' : 'Late night';
      const wmode = G.weather ? G.weather.mode : 'clear';
      const wlabel = wmode === 'light' ? 'Light rain' : wmode === 'heavy' ? 'Heavy rain' : 'Clear';
      this.weatherLabel.textContent = `${tod} · ${wlabel}`;
      this.healthFill.style.width = `${Math.max(0, G.health)}%`;
      this.armorFill.style.width = `${Math.max(0, G.armor)}%`;
      const c = G.combat;
      this.weaponBox.textContent = c.weapon === 'pistol'
        ? `Pistol — ${c.ammo} / ${c.reserve}`
        : 'Fists  (Q for pistol)';
      this.crosshair.classList.toggle('hidden', !(c.weapon === 'pistol' && !G.driving));
      if (G.driving) {
        this.speed.classList.remove('hidden');
        const kmh = Math.round(Math.abs(G.driving.speed) * 3.6);
        // v3: the nitro meter rides under the speedo in Mara's tuned car.
        const nitro = (G.nitro && G.garage && G.garage.ownedId === G.driving.id)
          ? `<br><small>${nitroStatusText(G)}</small>` : '';
        this.speed.innerHTML = `${kmh} <small>km/h</small>${nitro}`;
      } else if (G.boating) {
        // v3: the speedo reads knots of boat speed while sailing.
        this.speed.classList.remove('hidden');
        const kmh = Math.round(Math.abs(G.boating.speed) * 3.6);
        this.speed.innerHTML = `${kmh} <small>km/h · sailing</small>`;
      } else {
        this.speed.classList.add('hidden');
      }
      if (this.toastTimer > 0) {
        this.toastTimer -= dt;
        if (this.toastTimer <= 0) this.toastEl.textContent = '';
      }
      if (this.dialogueTimer > 0) {
        this.dialogueTimer -= dt;
        if (this.dialogueTimer <= 0) this.dialogue.classList.add('hidden');
      }
      // Muzzle flash: a brief bright crosshair.
      this.crosshair.style.opacity = c.muzzle > 0 ? '0.4' : '1';
    },
  };
  G.hud = hud;
  return hud;
}
