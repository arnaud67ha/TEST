// Secret Santa draw: assigns each giver exactly one receiver so that nobody
// draws themselves and no excluded pair is used. Returns null if impossible.
(function (root) {
  function shuffle(list, random) {
    const a = list.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // exclusions: array of [giver, receiver] pairs that are forbidden.
  function drawSecretSanta(names, exclusions, random) {
    random = random || Math.random;
    if (names.length < 2) return null;
    const forbidden = new Set(exclusions.map(([g, r]) => g + '\u0000' + r));
    const allowed = (g, r) => g !== r && !forbidden.has(g + '\u0000' + r);

    // Assign the most constrained givers first so backtracking stays fast.
    const givers = shuffle(names, random).sort(
      (a, b) =>
        names.filter((r) => allowed(a, r)).length -
        names.filter((r) => allowed(b, r)).length
    );
    const taken = new Set();
    const result = {};

    function assign(i) {
      if (i === givers.length) return true;
      const giver = givers[i];
      for (const receiver of shuffle(names, random)) {
        if (taken.has(receiver) || !allowed(giver, receiver)) continue;
        taken.add(receiver);
        result[giver] = receiver;
        if (assign(i + 1)) return true;
        taken.delete(receiver);
        delete result[giver];
      }
      return false;
    }

    return assign(0) ? result : null;
  }

  root.drawSecretSanta = drawSecretSanta;
})(typeof window !== 'undefined' ? window : globalThis);
