const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Klasyfikacja: <ol class="sort" data-opts="F:funkcjonalne|N:pozafunkcjonalne"><li data-a="F" data-why="...">
$$(".sort").forEach(list => {
  const opts = list.dataset.opts.split("|").map(o => o.split(":"));
  const items = [...list.children];
  const score = el("p", "score", `0 / ${items.length}`);
  list.after(score);
  let done = 0, ok = 0;

  items.forEach(li => {
    const bar = el("span", "opts");
    opts.forEach(([key, label]) => {
      const b = el("button", "", label || key);
      b.type = "button";
      b.dataset.key = key;
      b.onclick = () => {
        const good = key === li.dataset.a;
        $$("button", bar).forEach(x => {
          x.disabled = true;
          if (x.dataset.key === li.dataset.a) x.className = "picked-ok";
        });
        if (!good) b.className = "picked-bad";
        li.classList.add(good ? "ok" : "bad");
        li.append(el("p", "why", (good ? "Tak. " : "Nie tym razem. ") + li.dataset.why));
        done++; if (good) ok++;
        score.textContent = `${ok} / ${items.length} poprawnie` +
          (done === items.length ? (ok === items.length ? " — komplet." : " — przejrzyj uzasadnienia przy błędnych odpowiedziach.") : "");
      };
      bar.append(b);
    });
    li.append(bar);
  });
});

// Pytanie zamknięte: <div class="mc"><div class="choices"><button data-ok data-why="...">
$$(".mc").forEach(box => {
  const why = el("p", "why");
  box.append(why);
  $$(".choices button", box).forEach(b => {
    b.type = "button";
    b.onclick = () => {
      const good = b.hasAttribute("data-ok");
      b.classList.add(good ? "picked-ok" : "picked-bad");
      b.disabled = true;
      why.className = "why " + (good ? "ok" : "bad");
      why.textContent = b.dataset.why;
      if (good) $$(".choices button", box).forEach(x => x.disabled = true);
    };
  });
});

// Anatomia: przyciski z data-note, wynik w .note
$$(".anat-box").forEach(box => {
  const note = box.querySelector(".note");
  $$("[data-note]", box).forEach(b => {
    b.type = "button";
    b.onclick = () => {
      $$("[data-note]", box).forEach(x => x.classList.toggle("on", x === b));
      note.innerHTML = b.dataset.note;
    };
  });
});

// Detektor mętnych sformułowań
// ponytail: dopasowanie po rdzeniach, nie pełna fleksja — wystarcza do ćwiczenia
const VAGUE = [
  ["szybk", "„szybko” — ile to sekund? Podaj liczbę i warunki pomiaru."],
  ["sprawn", "„sprawnie” — nieweryfikowalne. Co konkretnie ma się wydarzyć i w jakim czasie?"],
  ["łatw", "„łatwo” — dla kogo? Zamień na mierzalne kryterium (np. liczba kroków)."],
  ["prost", "„prosty” — subiektywne. Opisz zachowanie, nie wrażenie."],
  ["intuicyj", "„intuicyjny” — nie da się tego przetestować wprost."],
  ["przyjazn", "„przyjazny” — jak wyżej: wrażenie, nie zachowanie."],
  ["user-friendly", "„user-friendly” — j.w. Do tego anglicyzm, który każdy rozumie inaczej."],
  ["wygodn", "„wygodny” — subiektywne."],
  ["nowoczesn", "„nowoczesny” — według jakiego wzorca i do kiedy?"],
  ["elastyczn", "„elastyczny” — co dokładnie ma dać się zmienić i przez kogo?"],
  ["efektywn", "„efektywny” — względem czego? Podaj miarę."],
  ["wydajn", "„wydajny” — to raczej wymaganie pozafunkcjonalne; podaj liczby."],
  ["optymaln", "„optymalny” — optymalny według jakiego kryterium?"],
  ["odpowiedni", "„odpowiedni” — kto i jak oceni, co jest odpowiednie?"],
  ["właściw", "„właściwy” — jak wyżej."],
  ["stosown", "„stosowny” — jak wyżej."],
  ["itp", "„itp.” — lista otwarta. Wymień wszystkie przypadki albo podaj regułę."],
  ["itd", "„itd.” — lista otwarta."],
  ["etc", "„etc.” — lista otwarta."],
  ["i inne", "„i inne” — lista otwarta."],
  ["zazwyczaj", "„zazwyczaj” — a w pozostałych przypadkach? Opisz wyjątki."],
  ["zwykle", "„zwykle” — jak wyżej."],
  ["w miarę możliwości", "„w miarę możliwości” — wymaganie, którego nie trzeba spełnić, nie jest wymaganiem."],
  ["jeśli to możliwe", "„jeśli to możliwe” — j.w."],
  ["w razie potrzeby", "„w razie potrzeby” — kto decyduje o potrzebie i na jakiej podstawie?"],
  ["obsługiw", "„obsługiwać” — czasownik-worek. Jakie konkretnie operacje?"],
  ["zarządza", "„zarządzać” — czasownik-worek. Dodawać? Usuwać? Edytować? Zatwierdzać?"],
  ["wspiera", "„wspierać” — co dokładnie system robi?"],
  ["dużo", "„dużo” — ile?"],
  ["wiel", "„wiele” — ile?"],
  ["kilk", "„kilka” — ile?"],
  ["niektór", "„niektóre” — które?"],
  ["około", "„około” — z jaką tolerancją?"],
  ["mniej więcej", "„mniej więcej” — z jaką tolerancją?"],
  ["wszystk", "„wszystkie” — na pewno wszystkie? Kwantyfikatory ogólne często kryją wyjątki."],
  ["nigdy", "„nigdy” — na pewno? Sprawdź wyjątki."],
  ["zawsze", "„zawsze” — na pewno? Sprawdź wyjątki."],
  ["i/lub", "„i/lub” — niejednoznaczne. Rozpisz przypadki."],
];
const vagueRe = new RegExp(
  "(?<![\\p{L}])(" + VAGUE.map(([s]) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")).join("|") + ")[\\p{L}.]*",
  "giu"
);

$$(".detector").forEach(box => {
  const ta = box.querySelector("textarea");
  const out = box.querySelector(".hl");
  const hits = box.querySelector(".hits");
  const run = () => {
    const text = ta.value;
    const found = new Map();
    let html = "", last = 0;
    for (const m of text.matchAll(vagueRe)) {
      const stem = m[1].toLowerCase();
      const tip = VAGUE.find(([s]) => s === stem)[1];
      found.set(stem, [m[0], tip]);
      html += esc(text.slice(last, m.index)) + `<mark title="${esc(tip)}">${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    out.innerHTML = html + esc(text.slice(last)) || "<span class='muted'>Wpisz wymaganie powyżej.</span>";
    hits.innerHTML = found.size
      ? [...found.values()].map(([w, tip]) => `<li><b>${esc(w)}</b> — ${esc(tip)}</li>`).join("")
      : text.trim() ? "<li>Nie znalazłem typowych pułapek. To nie znaczy, że wymaganie jest dobre — sprawdź je jeszcze z listą cech z §1.5.</li>" : "";
  };
  ta.addEventListener("input", run);
  $$("[data-sample]", box).forEach(b => b.onclick = () => { ta.value = b.dataset.sample; run(); });
  run();
});

// Kompozytor historyjki
$$(".composer").forEach(box => {
  const [role, want, why] = $$("input", box);
  const card = box.querySelector(".card p");
  const warn = box.querySelector(".warn");
  const run = () => {
    const r = role.value.trim(), w = want.value.trim(), y = why.value.trim();
    card.innerHTML = `<em>Jako</em> ${esc(r || "…")}<br><em>chcę</em> ${esc(w || "…")}<br><em>aby</em> ${esc(y || "…")}`;
    const msgs = [];
    if (/^(użytkownik|user|osoba|klient|ktoś)\b/i.test(r))
      msgs.push("Rola jest zbyt ogólna. Kto konkretnie? Student pierwszego roku, pracownik wypożyczalni, prowadząca zajęcia…");
    if (/\b(przycisk|klikn|baz[aęy]|tabel|api|endpoint|serwer|sql|formularz|dropdown|ekran|json|rest)/i.test(w))
      msgs.push("W części „chcę” pojawia się rozwiązanie techniczne. Historyjka opisuje potrzebę; sposób realizacji ustala się w rozmowie z zespołem.");
    if (/\s(i|oraz|a także)\s/i.test(w))
      msgs.push("Spójnik w części „chcę” — sprawdź, czy to nie są dwie historyjki.");
    if (w && !y)
      msgs.push("Brak części „aby”. Bez korzyści zespół nie wie, po co to robi, i nie może zaproponować lepszego rozwiązania.");
    if (y && w && y.toLowerCase().includes(w.toLowerCase()))
      msgs.push("Korzyść powtarza cel. „Aby” odpowiada na pytanie: co rola zyska?");
    if (/^(mieć|móc)\s/i.test(y))
      msgs.push("Korzyść zaczyna się od „mieć/móc” — często to wciąż opis funkcji. Jaki problem roli to rozwiązuje?");
    if (VAGUE.some(([s]) => new RegExp("(?<![\\p{L}])" + s, "iu").test(w)))
      msgs.push("W celu jest mętne słowo (z listy z tematu 1). Czy da się to przetestować?");
    if (r && w && y && !msgs.length) msgs.push("good:Formalnie w porządku. Teraz pytanie zasadnicze: czy przejdzie przez INVEST (§2.3)?");
    warn.innerHTML = msgs.map(m => m.startsWith("good:") ? `<li class="good">${m.slice(5)}</li>` : `<li>${m}</li>`).join("");
  };
  [role, want, why].forEach(i => i.addEventListener("input", run));
  box.querySelector("[data-copy-story]").onclick = e => {
    navigator.clipboard.writeText(card.innerText.replace(/\n/g, " "));
    e.target.textContent = "skopiowano";
  };
  run();
});

// Układanie w kolejności: <div class="order"><ul class="pool"><li data-n="1">
$$(".order").forEach(box => {
  const pool = box.querySelector(".pool");
  const done = box.querySelector(".done");
  const status = box.querySelector(".score");
  const total = pool.children.length;
  let next = 1, misses = 0;
  [...pool.children].forEach(li => {
    const b = el("button", "", li.textContent);
    b.type = "button";
    li.replaceChildren(b);
    b.onclick = () => {
      if (+li.dataset.n === next) {
        done.append(el("li", "", li.textContent));
        li.remove();
        next++;
        status.textContent = next > total
          ? `Gotowe. Pomyłki: ${misses}.`
          : `${next - 1} / ${total}`;
      } else {
        misses++;
        b.classList.remove("shake");
        void b.offsetWidth;
        b.classList.add("shake");
      }
    };
  });
});

// Kopiowanie szablonu
$$("[data-copy]").forEach(b => b.onclick = () => {
  navigator.clipboard.writeText(document.querySelector(b.dataset.copy).textContent);
  b.textContent = "skopiowano";
});

// Koszt błędu: przyciski z data-x (mnożnik), pasek skalowany logarytmicznie
$$(".cost").forEach(box => {
  const bar = box.querySelector(".bar span");
  const note = box.querySelector(".note");
  $$("[data-x]", box).forEach(b => b.onclick = () => {
    const x = +b.dataset.x;
    $$("[data-x]", box).forEach(o => o.classList.toggle("picked-ok", o === b));
    bar.style.width = (8 + 92 * Math.log10(x) / 2) + "%";
    bar.textContent = "× " + x;
    note.className = "note";
    note.textContent = b.dataset.t;
  });
});

// Autodiagnoza
$$(".check").forEach(box => {
  const boxes = $$("input[type=checkbox]", box);
  const score = box.querySelector(".score");
  const run = () => {
    const n = boxes.filter(c => c.checked).length;
    score.textContent = `${n} / ${boxes.length}` + (n > 3
      ? " — sporo. Większość z tych sytuacji ma źródło w wymaganiach, nie w kodzie."
      : n ? " — każda z tych sytuacji ma związek z wymaganiami." : "");
  };
  boxes.forEach(c => c.onchange = run);
});
