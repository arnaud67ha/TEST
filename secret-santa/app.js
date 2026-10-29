(function () {
  const STORAGE_KEY = 'secret-santa-v1';
  const $ = (id) => document.getElementById(id);

  const emptyState = () => ({
    event: { name: '', budget: '', date: '' },
    participants: [],
    exclusions: [], // [giver, receiver]
    assignment: null, // { giver: receiver }
    seen: [],
  });

  let state = load();
  let current = null; // participant currently revealing

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return Object.assign(emptyState(), JSON.parse(raw));
    } catch (e) { /* storage unavailable: start fresh */ }
    return emptyState();
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function show(screen) {
    document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== 'screen-' + screen; });
    window.scrollTo(0, 0);
  }

  function showError(el, message) {
    el.textContent = message || '';
    el.hidden = !message;
  }

  function el(tag, props, children) {
    const node = Object.assign(document.createElement(tag), props || {});
    (children || []).forEach((c) => node.append(c));
    return node;
  }

  function formatMeta() {
    const parts = [];
    if (state.event.budget !== '') parts.push('Budget max : ' + state.event.budget + ' €');
    if (state.event.date) {
      const d = new Date(state.event.date + 'T12:00:00');
      parts.push('Échange le ' + d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    }
    return parts.join(' · ');
  }

  // ---------- Préparation ----------

  function renderSetup() {
    $('event-name').value = state.event.name;
    $('event-budget').value = state.event.budget;
    $('event-date').value = state.event.date;

    const n = state.participants.length;
    $('participant-count').textContent = n ? '(' + n + ')' : '';
    const list = $('participant-list');
    list.replaceChildren(...state.participants.map((name) =>
      el('li', {}, [
        name,
        el('button', {
          className: 'chip-remove', type: 'button', textContent: '×',
          ariaLabel: 'Retirer ' + name,
          onclick: () => removeParticipant(name),
        }),
      ])
    ));

    const options = state.participants.map((p) => el('option', { value: p, textContent: p }));
    $('exclusion-a').replaceChildren(...options.map((o) => o.cloneNode(true)));
    $('exclusion-b').replaceChildren(...options.map((o) => o.cloneNode(true)));
    if (n > 1) $('exclusion-b').selectedIndex = 1;

    $('exclusion-list').replaceChildren(...state.exclusions.map(([a, b]) =>
      el('li', {}, [
        el('span', { textContent: a + ' ne tire pas ' + b }),
        el('button', {
          className: 'link danger', type: 'button', textContent: 'Retirer',
          onclick: () => {
            state.exclusions = state.exclusions.filter(([x, y]) => !(x === a && y === b));
            save(); renderSetup();
          },
        }),
      ])
    ));
  }

  function removeParticipant(name) {
    state.participants = state.participants.filter((p) => p !== name);
    state.exclusions = state.exclusions.filter(([a, b]) => a !== name && b !== name);
    save(); renderSetup();
  }

  $('add-participant').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('participant-name');
    const name = input.value.trim().replace(/\s+/g, ' ');
    if (!name) return;
    if (state.participants.some((p) => p.toLowerCase() === name.toLowerCase())) {
      return showError($('participant-error'), name + ' est déjà dans la liste.');
    }
    showError($('participant-error'));
    state.participants.push(name);
    input.value = '';
    input.focus();
    save(); renderSetup();
  });

  $('add-exclusion').addEventListener('submit', (e) => {
    e.preventDefault();
    const a = $('exclusion-a').value;
    const b = $('exclusion-b').value;
    if (!a || !b) return showError($('exclusion-error'), 'Ajoute d\'abord des participants.');
    if (a === b) return showError($('exclusion-error'), 'Choisis deux personnes différentes.');
    showError($('exclusion-error'));
    const pairs = $('exclusion-both').checked ? [[a, b], [b, a]] : [[a, b]];
    pairs.forEach(([x, y]) => {
      if (!state.exclusions.some(([p, q]) => p === x && q === y)) state.exclusions.push([x, y]);
    });
    save(); renderSetup();
  });

  ['name', 'budget', 'date'].forEach((field) => {
    $('event-' + field).addEventListener('input', (e) => {
      state.event[field] = e.target.value;
      save();
    });
  });

  function runDraw() {
    if (state.participants.length < 3) {
      showError($('draw-error'), 'Il faut au moins 3 participants.');
      return false;
    }
    const result = window.drawSecretSanta(state.participants, state.exclusions);
    if (!result) {
      showError($('draw-error'), 'Tirage impossible avec ces exclusions : quelqu\'un n\'a plus personne à qui offrir. Retire une exclusion ou ajoute un participant.');
      return false;
    }
    showError($('draw-error'));
    state.assignment = result;
    state.seen = [];
    save();
    return true;
  }

  $('draw-button').addEventListener('click', () => {
    if (runDraw()) { renderList(); show('list'); }
  });

  // ---------- Liste ----------

  function renderList() {
    $('list-title').textContent = state.event.name || 'Secret Santa';
    $('list-meta').textContent = formatMeta();
    $('reveal-list').replaceChildren(...state.participants.map((name) => {
      const seen = state.seen.includes(name);
      return el('li', {}, [
        el('button', {
          className: 'name-button' + (seen ? ' seen' : ''),
          disabled: seen,
          textContent: seen ? '✓ ' + name : name,
          onclick: () => { current = name; $('confirm-name').textContent = name; show('confirm'); },
        }),
      ]);
    }));
    $('all-seen').hidden = state.seen.length !== state.participants.length;
  }

  $('cancel-button').addEventListener('click', () => { current = null; show('list'); });

  $('reveal-button').addEventListener('click', () => {
    $('reveal-giver').textContent = current;
    $('reveal-receiver').textContent = state.assignment[current];
    $('reveal-meta').textContent = formatMeta();
    $('gift').classList.remove('open');
    $('gift').disabled = false;
    $('gift-hint').hidden = false;
    $('reveal-result').hidden = true;
    show('reveal');
  });

  $('gift').addEventListener('click', () => {
    $('gift').classList.add('open');
    $('gift').disabled = true;
    $('gift-hint').hidden = true;
    $('reveal-result').hidden = false;
    if (window.festive) {
      window.festive.burst($('gift'));
      window.festive.jingle();
    }
  });

  $('hide-button').addEventListener('click', () => {
    $('reveal-giver').textContent = '';
    $('reveal-receiver').textContent = '';
    if (!state.seen.includes(current)) state.seen.push(current);
    current = null;
    save(); renderList(); show('list');
  });

  // Confirmation shown in the page (native confirm() is blocked in some embeds).
  let pendingAction = null;
  function askConfirm(message, action) {
    pendingAction = action;
    $('action-confirm-text').textContent = message;
    $('action-confirm').hidden = false;
    $('list-actions').hidden = true;
  }
  function closeConfirm() {
    pendingAction = null;
    $('action-confirm').hidden = true;
    $('list-actions').hidden = false;
  }
  $('action-confirm-no').addEventListener('click', closeConfirm);
  $('action-confirm-yes').addEventListener('click', () => {
    const action = pendingAction;
    closeConfirm();
    if (action) action();
  });

  $('redraw-button').addEventListener('click', () => {
    askConfirm('Refaire le tirage ? Tout le monde devra redécouvrir son destinataire.', () => {
      if (runDraw()) renderList();
    });
  });

  $('reset-button').addEventListener('click', () => {
    askConfirm('Revenir à la préparation ? Le tirage actuel sera effacé.', () => {
      state.assignment = null;
      state.seen = [];
      save(); renderSetup(); show('setup');
    });
  });

  // ---------- Démarrage ----------

  // A saved draw that no longer matches the participants is discarded.
  if (state.assignment && state.participants.every((p) => p in state.assignment)) {
    renderList(); show('list');
  } else {
    state.assignment = null;
    renderSetup(); show('setup');
  }
})();
