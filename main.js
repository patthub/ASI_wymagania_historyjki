const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Spis treści z nagłówków h2
$$(".toc ol").forEach(ol => {
  $$("main h2").forEach((h, i) => {
    h.id ||= "s" + (i + 1);
    const a = el("a", "", h.textContent);
    a.href = "#" + h.id;
    const li = el("li");
    li.append(a);
    ol.append(li);
  });
});

// Klasyfikacja: <ol class="sort" data-opts="F:funkcjonalne|N:pozafunkcjonalne"><li data-a="F" data-why="...">
$$(".sort").forEach(list => {
  const opts = list.dataset.opts.split("|").map(o => o.split(":"));
  const items = [...list.children];
  const score = el("p", "score", `Wynik: 0 / ${items.length}`);
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
        li.append(el("p", "why", (good ? "Dobrze! " : "Niestety nie. ") + li.dataset.why));
        done++; if (good) ok++;
        score.textContent = `Wynik: ${ok} / ${items.length}` +
          (done === items.length ? (ok === items.length ? ". Wszystko dobrze!" : ". Przeczytaj wyjaśnienia przy błędnych odpowiedziach.") : "");
      };
      bar.append(b);
    });
    li.append(bar);
  });
});

// Pytanie zamknięte: <div class="mc"><div class="choices"><button data-ok data-why="...">
$$(".mc").forEach(box => {
  const why = el("p", "why");
  why.hidden = true;
  box.append(why);
  $$(".choices button", box).forEach(b => {
    b.type = "button";
    b.onclick = () => {
      const good = b.hasAttribute("data-ok");
      b.classList.add(good ? "picked-ok" : "picked-bad");
      b.disabled = true;
      why.hidden = false;
      why.className = "why " + (good ? "ok" : "bad");
      why.textContent = (good ? "Dobrze! " : "Niestety nie. Spróbuj jeszcze raz. ") + b.dataset.why;
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

// Detektor niejasnych sformułowań
// ponytail: dopasowanie po rdzeniach, nie pełna fleksja; do ćwiczenia wystarcza
const VAGUE = [
  ["szybk", "Ile to sekund? Podaj liczbę."],
  ["sprawn", "Nie da się tego sprawdzić. Co dokładnie ma się stać?"],
  ["łatw", "Łatwe dla kogo? Można np. podać liczbę kroków."],
  ["prost", "To ocena subiektywna. Opisz zachowanie systemu."],
  ["intuicyj", "Nie da się tego przetestować."],
  ["przyjazn", "To ocena subiektywna."],
  ["user-friendly", "To ocena subiektywna."],
  ["wygodn", "To ocena subiektywna."],
  ["nowoczesn", "Według jakiego wzorca?"],
  ["elastyczn", "Co ma się dać zmienić i kto ma to robić?"],
  ["efektywn", "Podaj miarę."],
  ["wydajn", "To raczej wymaganie pozafunkcjonalne. Podaj liczby."],
  ["optymaln", "Optymalny według jakiego kryterium?"],
  ["odpowiedni", "Kto zdecyduje, co jest odpowiednie?"],
  ["właściw", "Kto zdecyduje, co jest właściwe?"],
  ["stosown", "Kto zdecyduje, co jest stosowne?"],
  ["itp", "Lista otwarta. Wymień wszystkie przypadki."],
  ["itd", "Lista otwarta. Wymień wszystkie przypadki."],
  ["etc", "Lista otwarta. Wymień wszystkie przypadki."],
  ["i inne", "Lista otwarta. Wymień wszystkie przypadki."],
  ["zazwyczaj", "A co w pozostałych przypadkach?"],
  ["zwykle", "A co w pozostałych przypadkach?"],
  ["w miarę możliwości", "Takiego wymagania nie trzeba spełnić, więc nie jest wymaganiem."],
  ["jeśli to możliwe", "Takiego wymagania nie trzeba spełnić, więc nie jest wymaganiem."],
  ["w razie potrzeby", "Kto decyduje, że jest potrzeba?"],
  ["obsługiw", "Zbyt ogólne. Jakie konkretnie operacje?"],
  ["zarządza", "Zbyt ogólne. Dodawanie? Usuwanie? Edycja?"],
  ["wspiera", "Zbyt ogólne. Co konkretnie robi system?"],
  ["dużo", "Ile?"],
  ["wiel", "Ile?"],
  ["kilk", "Ile?"],
  ["niektór", "Które?"],
  ["około", "Z jaką tolerancją?"],
  ["mniej więcej", "Z jaką tolerancją?"],
  ["wszystk", "Czy na pewno wszystkie? Sprawdź wyjątki."],
  ["nigdy", "Czy na pewno nigdy? Sprawdź wyjątki."],
  ["zawsze", "Czy na pewno zawsze? Sprawdź wyjątki."],
  ["i/lub", "Niejednoznaczne. Rozpisz przypadki."],
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
      found.set(m[0].toLowerCase(), [m[0], tip]);
      html += esc(text.slice(last, m.index)) + `<mark title="${esc(tip)}">${esc(m[0])}</mark>`;
      last = m.index + m[0].length;
    }
    out.innerHTML = html + esc(text.slice(last)) || "<span class='muted'>Tu pojawi się Twoje wymaganie.</span>";
    hits.innerHTML = found.size
      ? [...found.values()].map(([w, tip]) => `<li><b>${esc(w)}</b>: ${esc(tip)}</li>`).join("")
      : text.trim() ? "<li>Nie znaleziono typowych problemów. Sprawdź jeszcze wymaganie z listą cech z punktu 1.5.</li>" : "";
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
      msgs.push("Rola jest zbyt ogólna. Napisz, kto to jest, np. student, pracownik wypożyczalni, prowadząca zajęcia.");
    if (/\b(przycisk|klikn|baz[aęy]|tabel|api|endpoint|serwer|sql|formularz|dropdown|ekran|json|rest)/i.test(w))
      msgs.push("W części „chcę” opisujesz rozwiązanie techniczne. Opisz raczej, czego potrzebuje użytkownik.");
    if (/\s(i|oraz|a także)\s/i.test(w))
      msgs.push("W części „chcę” jest spójnik. Sprawdź, czy to nie są dwie osobne historyjki.");
    if (w && !y)
      msgs.push("Brakuje części „aby”. Dopisz, jaką korzyść ma z tego użytkownik.");
    if (y && w && y.toLowerCase().includes(w.toLowerCase()))
      msgs.push("Część „aby” powtarza cel. Napisz, co użytkownik dzięki temu zyska.");
    if (/^(mieć|móc)\s/i.test(y))
      msgs.push("Część „aby” zaczyna się od „mieć” lub „móc”. Często oznacza to, że nadal opisujesz funkcję, a nie korzyść.");
    if (VAGUE.some(([s]) => new RegExp("(?<![\\p{L}])" + s, "iu").test(w)))
      msgs.push("W celu jest niejasne słowo (zob. temat 1). Czy da się to sprawdzić?");
    if (r && w && y && !msgs.length) msgs.push("good:Wygląda dobrze. Sprawdź jeszcze historyjkę z kryteriami INVEST (punkt 2.3).");
    warn.innerHTML = msgs.map(m => m.startsWith("good:") ? `<li class="good">${m.slice(5)}</li>` : `<li>${m}</li>`).join("");
  };
  [role, want, why].forEach(i => i.addEventListener("input", run));
  box.querySelector("[data-copy-story]").onclick = e => {
    navigator.clipboard.writeText(card.innerText.replace(/\n/g, " "));
    e.target.textContent = "Skopiowano";
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
          ? `Gotowe! Liczba pomyłek: ${misses}.`
          : `Ułożono ${next - 1} z ${total}`;
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
  b.textContent = "Skopiowano";
});

// Koszt błędu: przyciski z data-x (mnożnik), pasek w skali logarytmicznej
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
    score.textContent = `Zaznaczono: ${n} / ${boxes.length}` + (n > 3
      ? ". To sporo. Większość tych sytuacji wynika z problemów z wymaganiami."
      : n ? ". Każda z tych sytuacji ma związek z wymaganiami." : "");
  };
  boxes.forEach(c => c.onchange = run);
});
