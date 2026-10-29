// Decorations: falling snow in the background and a confetti burst when a gift opens.
(function () {
  const canvas = document.getElementById('snow');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const confettiColors = ['#e23b32', '#f2c14e', '#f7f3ea', '#3fa36b'];
  let width = 0;
  let height = 0;
  let flakes = [];
  let confetti = [];

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.round(Math.min(120, (width * height) / 9000));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 2.2,
      speed: 0.3 + Math.random() * 0.9,
      drift: Math.random() * Math.PI * 2,
    }));
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    for (const f of flakes) {
      if (!reduceMotion) {
        f.y += f.speed;
        f.drift += 0.01;
        f.x += Math.sin(f.drift) * 0.4;
        if (f.y > height + 4) { f.y = -4; f.x = Math.random() * width; }
      }
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    confetti = confetti.filter((c) => c.life > 0);
    for (const c of confetti) {
      c.vy += 0.15;
      c.x += c.vx;
      c.y += c.vy;
      c.spin += c.vspin;
      c.life -= 1;
      ctx.save();
      ctx.globalAlpha = Math.min(1, c.life / 30);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.spin);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.size / 2, -c.size / 4, c.size, c.size / 2);
      ctx.restore();
    }
    if (!reduceMotion || confetti.length) requestAnimationFrame(frame);
  }

  function burst(element) {
    if (reduceMotion) return;
    const box = element.getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 3;
    for (let i = 0; i < 90; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const speed = 4 + Math.random() * 6;
      confetti.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 6,
        spin: Math.random() * Math.PI,
        vspin: (Math.random() - 0.5) * 0.3,
        color: confettiColors[i % confettiColors.length],
        life: 90 + Math.random() * 40,
      });
    }
  }

  // ---------- Son ----------

  const SOUND_KEY = 'secret-santa-sound';
  let soundOn = true;
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { /* ignore */ }
  let audio = null;

  function note(freq, start, duration, type, volume) {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain).connect(audio.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  // Sleigh bells, then a rising C major arpeggio ending on a chord.
  function jingle() {
    if (!soundOn) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
    } catch (e) { return; }
    const t = audio.currentTime + 0.02;
    for (let i = 0; i < 14; i++) {
      const at = t + i * 0.035 + Math.random() * 0.02;
      note(2400 + Math.random() * 2200, at, 0.18, 'sine', 0.05);
    }
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, t + 0.25 + i * 0.1, 0.35, 'triangle', 0.18));
    [523.25, 659.25, 783.99, 1046.5].forEach((f) => note(f, t + 0.75, 0.9, 'triangle', 0.09));
    note(2093, t + 0.75, 0.6, 'sine', 0.05);
  }

  const toggle = document.getElementById('sound-toggle');
  function renderToggle() {
    if (!toggle) return;
    toggle.setAttribute('aria-pressed', String(soundOn));
    toggle.textContent = soundOn ? '🔔' : '🔕';
    toggle.title = toggle.ariaLabel = soundOn ? 'Couper le son' : 'Activer le son';
  }
  if (toggle) {
    toggle.addEventListener('click', () => {
      soundOn = !soundOn;
      try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (e) { /* ignore */ }
      renderToggle();
    });
    renderToggle();
  }

  // ---------- Surprises au clic ----------

  const GAG_CHANCE = 0.25;
  const bubbles = ['Ho ho ho !', 'Joyeux Noël !', 'Hé hé !', 'Chuuut…', 'Youpi !', 'Miam, du pain d\'épices'];
  const toasts = [
    'Un lutin a vu ce clic. Il note tout dans son carnet.',
    'Rappel du Père Noël : les chaussettes ne comptent pas comme un cadeau.',
    'Rodolphe le renne te surveille. Sois sage.',
    'Info lutins : 3 % des cadeaux finissent sous le canapé.',
    'Le Père Noël valide ce clic avec enthousiasme.',
    'Alerte : quelqu\'un a mangé tous les chocolats du calendrier de l\'Avent.',
    'Conseil de lutin : le papier cadeau se recycle, pas le beau-frère.',
  ];
  let lastGag = 0;
  let previousGag = -1;

  function addGag(className, text, style) {
    const el = document.createElement('div');
    el.className = 'gag ' + className;
    if (text) el.textContent = text;
    Object.assign(el.style, style || {});
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 4000);
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  const gags = [
    (x, y) => addGag('gag-bubble', pick(bubbles), { left: x + 'px', top: y + 'px' }),
    () => addGag('gag-sleigh', '🦌🦌🛷🎅'),
    (x, y) => addGag('gag-splat', '', { left: x + 'px', top: y + 'px' }),
    () => addGag('gag-toast', pick(toasts)),
    () => addGag('gag-reindeer', '🦌', { left: 10 + Math.random() * 70 + 'vw' }),
    () => {
      const app = document.getElementById('app');
      app.classList.remove('shake');
      void app.offsetWidth;
      app.classList.add('shake');
      setTimeout(() => app.classList.remove('shake'), 600);
      burst(app.querySelector('.brand') || app);
    },
  ];

  // Never during the reveal, so nothing covers the drawn name.
  document.addEventListener('click', (e) => {
    if (reduceMotion || !e.target.closest('button') || e.target.closest('#sound-toggle')) return;
    const reveal = document.getElementById('screen-reveal');
    if (reveal && !reveal.hidden) return;
    const now = Date.now();
    if (now - lastGag < 2500 || Math.random() > GAG_CHANCE) return;
    lastGag = now;
    let index;
    do { index = Math.floor(Math.random() * gags.length); } while (index === previousGag);
    previousGag = index;
    gags[index](e.clientX, e.clientY);
  });

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(frame);
  window.festive = { burst, jingle };
})();
