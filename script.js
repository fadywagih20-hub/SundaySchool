
/* ====== 1) ضع إعدادات مشروع Firebase هنا (Project settings > Web app) ====== */
const firebaseConfig = {
  apiKey: "AIzaSyBMUyY6a3EVUgQAEBFJtuuXsCLy7z-5hA0",
  authDomain: "sunday-school-4c80b.firebaseapp.com",
  projectId: "sunday-school-4c80b",
  appId: "1:579717155944:web:0595e36c3154229b67bfdd"
};
/* ========================================================================= */

const LIVE = !!firebaseConfig.apiKey;
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pad = n => String(n).padStart(2, "0");
const AVATAR = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="#27325a"/><circle cx="50" cy="38" r="18" fill="#8b97c7"/><path d="M14 100a36 36 0 0172 0z" fill="#8b97c7"/></svg>');
const MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const FIELDS = [["m", "church", "tn0", "القداس"], ["t", "tunic", "tn", "التونية"], ["s", "book", "sv", "الخدمة"]];

let kids = [], year, monthIdx = 0, view = "track", editId = null, photoData = "", mode = "login", q = "";
const now = new Date();
year = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;

/* ---------- طبقة البيانات: Firebase أو تخزين محلي تجريبي ---------- */
let auth, db, col, unsub, fb = {};
const LS = "ss_kids";
const HOST = "kerolloesatef7@gmail.com", PW = 4468333679990479;
const h53 = (str, seed = 0) => { let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed; for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507); h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507); h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909); return 4294967296 * (2097151 & h2) + (h1 >>> 0); };
const LBL = { m: "القداس", t: "التونية", s: "الخدمة", b: "البونص", v: "الافتقاد التليفوني" };
const hk = n => "h" + year + "_" + n;
let userEmail = "", logs = [], unsubLog;
const me = () => LIVE ? (auth?.currentUser?.email || "") : (localStorage.getItem("ss_user") || "");
const isHost = () => userEmail.toLowerCase() === HOST;
const when = t => t ? new Date(t).toLocaleString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
const dateLabel = k => new Date(+k.slice(1, 5), +k.slice(5, 7) - 1, +k.slice(7)).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });
const store = {
  async save(k) { LIVE ? await fb.setDoc(fb.doc(col, k.id), k, { merge: true }) : (local(k.id, k), emit()); },
  async remove(id) { LIVE ? await fb.deleteDoc(fb.doc(col, id)) : (kids = kids.filter(x => x.id !== id), persist(), emit()); },
  async setAtt(id, key, f, v) {
    const k = kids.find(x => x.id === id), old = k.att?.[key]?.[f] ?? 0; if (old == v) return;
    const meta = { by: userEmail, at: Date.now() };
    if (LIVE) await fb.setDoc(fb.doc(col, id), { att: { [key]: { [f]: v, ...meta } }, lastBy: meta.by, lastAt: meta.at }, { merge: true });
    else { ((k.att ??= {})[key] ??= {})[f] = v; Object.assign(k.att[key], meta); k.lastBy = meta.by; k.lastAt = meta.at; persist(); emit(); }
    store.log("att", k, `${LBL[f]}: ${old | 0} ← ${v} (${dateLabel(key)})`);
  },
  async setHome(id, n, v) { const k = kids.find(x => x.id === id), old = k.home?.[hk(n)]?.v ? 1 : 0; if (old == v) return;
    const meta = { v, by: userEmail, at: Date.now() };
    if (LIVE) await fb.setDoc(fb.doc(col, id), { home: { [hk(n)]: meta }, lastBy: meta.by, lastAt: meta.at }, { merge: true });
    else { (k.home ??= {})[hk(n)] = meta; k.lastBy = meta.by; k.lastAt = meta.at; persist(); emit(); }
    store.log("att", k, `الافتقاد المنزلي: الزيارة ${n} من ٣ ← ${v ? "تمت" : "أُلغيت"}`); },
  log(type, k, detail) { const e = { email: userEmail, ts: Date.now(), type, kid: k.name, kidId: k.id, detail };
    if (LIVE) fb.addDoc(fb.collection(db, "logs"), e).catch(() => {});
    else { const L = JSON.parse(localStorage.getItem("ss_logs") || "[]"); L.unshift(e); localStorage.setItem("ss_logs", JSON.stringify(L.slice(0, 500))); if (isHost()) { logs = L; renderLog(); } } }
};
const persist = () => localStorage.setItem(LS, JSON.stringify(kids));
const local = (id, k) => { const i = kids.findIndex(x => x.id === id); i < 0 ? kids.push(k) : kids[i] = { ...kids[i], ...k }; persist(); };
const emit = () => renderAll();

if (LIVE) {
  if (location.protocol === "file:") $("#demoNote").textContent = "⚠ افتح الموقع من سيرفر (localhost أو Firebase Hosting) وليس بالضغط المباشر على الملف.";
  (async () => { try {
    const B = "https://www.gstatic.com/firebasejs/10.12.2/";
    const [A, Au, Fs] = await Promise.all([import(B + "firebase-app.js"), import(B + "firebase-auth.js"), import(B + "firebase-firestore.js")]);
    fb = { ...Au, ...Fs }; const app = A.initializeApp(firebaseConfig); auth = fb.getAuth(app); db = fb.getFirestore(app); col = fb.collection(db, "kids");
    fb.onAuthStateChanged(auth, u => {
      if (u) { unsub = fb.onSnapshot(col, snap => { kids = snap.docs.map(d => ({ id: d.id, ...d.data() })); renderAll(); }, e => toast("لا توجد صلاحية قراءة — راجع قواعد Firestore"));
        enter(); }
      else { unsub?.(); $("#app").hidden = true; $("#auth").hidden = false; $("#auth").classList.remove("leave"); }
    });
  } catch (e) { $("#authErr").textContent = "تعذر تحميل Firebase — تأكد من الإنترنت ومن الإعدادات"; } })();
} else {
  $("#demoNote").textContent = "⚠ وضع تجريبي: أضف إعدادات Firebase في script.js لتفعيل الحسابات والمزامنة.";
  kids = JSON.parse(localStorage.getItem(LS) || "[]");
  if (!kids.length) kids = ["مينا رامز","مارك سامي","يوسف عادل","كيرلس ماهر","بيشوي نبيل","جورج إيهاب","أنطونيوس هاني","دانيال مجدي"].map((name, i) => ({ id: "d" + i, name }));
  if (localStorage.getItem("ss_user")) enter();
}
function enter() { if (!$("#app").hidden) return; $("#auth").classList.add("leave");
  setTimeout(() => { userEmail = me(); setupHost(); $("#auth").hidden = true; $("#app").hidden = false; $("#app").classList.add("in"); renderAll(); play($("#v-track")); play($("#stats")); confetti(24); }, 450); }

/* ---------- تسجيل الدخول / إنشاء حساب ---------- */
const errMsg = c => ({ "auth/invalid-credential": "بيانات الدخول غير صحيحة", "auth/email-already-in-use": "هذا البريد مسجّل بالفعل", "auth/weak-password": "كلمة المرور ضعيفة", "auth/invalid-email": "بريد غير صالح", "net": "تعذر الاتصال بـ Firebase — تأكد من الإعدادات وشغّل من سيرفر" }[c] || "حدث خطأ، حاول مجدداً");
$("#toggleAuth").onclick = e => { e.preventDefault(); mode = mode === "login" ? "signup" : "login";
  $("#authBtn").textContent = mode === "login" ? "تسجيل الدخول" : "إنشاء حساب";
  e.target.textContent = mode === "login" ? "ليس لديك حساب؟ أنشئ حساباً جديداً" : "لديك حساب؟ سجّل دخولك"; };
$("#authBtn").onclick = async () => {
  const em = $("#email").value.trim(), pw = $("#pass").value; $("#authErr").textContent = "";
  if (!em || pw.length < 6) return $("#authErr").textContent = "أدخل بريداً وكلمة مرور (6 أحرف+)";
  if (!LIVE) { localStorage.setItem("ss_user", em); return enter(); }
  try { if (!auth) throw { code: "net" }; await fb[mode === "login" ? "signInWithEmailAndPassword" : "createUserWithEmailAndPassword"](auth, em, pw); }
  catch (e) { $("#authErr").textContent = errMsg(e.code); }
};
$("#googleBtn").onclick = async () => { if (!LIVE) { localStorage.setItem("ss_user", "demo@local"); return enter(); }
  try { if (!auth) throw { code: "net" }; await fb.signInWithPopup(auth, new fb.GoogleAuthProvider()); } catch (e) { $("#authErr").textContent = errMsg(e.code); } };
$("#logout").onclick = () => LIVE ? fb.signOut(auth) : (localStorage.removeItem("ss_user"), location.reload());

/* ---------- حسابات التقويم والنقاط ---------- */
const fridays = (y, m) => { const r = [], d = new Date(y, m, 1); while (d.getMonth() === m) { if (d.getDay() === 5) r.push(new Date(d)); d.setDate(d.getDate() + 1); } return r; };
const key = d => "d" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
const svcMonths = () => Array.from({ length: 12 }, (_, i) => { const m = (9 + i) % 12; return { m, y: year + (m >= 9 ? 0 : 1) }; });
const passed = () => svcMonths().flatMap(({ y, m }) => fridays(y, m)).filter(d => d <= now);
const dayTotal = a => a ? (a.m | 0) + (a.t | 0) + (a.s | 0) + (+a.b || 0) : 0;
function stats(k) {
  const P = passed(), n = Math.max(P.length, 1), pct = f => Math.round(P.reduce((s, d) => s + ((k.att?.[key(d)]?.[f]) | 0), 0) / n * 100);
  const pts = svcMonths().flatMap(({ y, m }) => fridays(y, m)).reduce((s, d) => s + dayTotal(k.att?.[key(d)]), 0);
  return { pts, m: pct("m"), t: pct("t"), s: pct("s") };
}
const ranked = () => kids.map(k => ({ ...k, ...stats(k) })).sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name, "ar")).map((k, i) => ({ ...k, rank: i + 1 }));
const filt = l => l.filter(k => k.name.includes(q));
const bar = (v, c) => `<div class="pb"><i style="width:${v}%;background:${c}"></i><span>${v}%</span></div>`;

/* ---------- العرض ---------- */
function renderAll() {
  $("#year").innerHTML = [year - 1, year, year + 1].map(y => `<option value="${y}" ${y === year ? "selected" : ""}>${y} / ${y + 1}</option>`).join("");
  const R = ranked(), top = R[0], pr = passed().length;
  $("#stats").innerHTML = `<div class="st">المخدومين<b>${R.length}</b></div><div class="st">الجمع المسجلة<b>${pr}</b></div><div class="st">الأول حالياً<b>${top ? esc(top.name.split(" ")[0]) : "-"}</b></div><div class="st">أعياد ميلاد الشهر<b>${kids.filter(k => k.birth && new Date(k.birth).getMonth() === now.getMonth()).length}</b></div>`;
  renderTrack(R); renderBoard(R); renderKids(R); renderLog(); countUp();
}
function renderTrack(R) {
  const ms = svcMonths(); $("#months").innerHTML = ms.map(({ m, y }, i) => `<button class="${i === monthIdx ? "on" : ""}" data-i="${i}">${MONTHS[m]} ${y}</button>`).join("");
  const { m, y } = ms[monthIdx], F = fridays(y, m), list = filt([...kids].sort((a, b) => a.name.localeCompare(b.name, "ar")));
  let h = `<thead><tr><th class="nm" rowspan="2">الاسم</th>${F.map(d => `<th colspan="6" class="day">${d.getDate()} ${MONTHS[m]}</th>`).join("")}<th rowspan="2">إجمالي الشهر</th><th rowspan="2" title="افتقاد تليفوني هذا الشهر">${I("phone")} الشهر</th><th colspan="3" class="hgrp">${I("home")} افتقاد منزلي — ٣ مرات في السنة</th></tr><tr>${F.map(() => FIELDS.map(f => `<th title="${f[3]}">${I(f[1])}</th>`).join("") + "<th>" + I("star") + "</th><th>Σ</th><th>" + I("phone") + "</th>").join("") + "<th>١</th><th>٢</th><th>٣</th>"}</tr></thead><tbody>`;
  h += list.map((k, idx) => { let mt = 0, pc = 0; const cells = F.map(d => { const a = k.att?.[key(d)] || {}, t = dayTotal(a); mt += t; pc += a.v ? 1 : 0;
    return FIELDS.map(([f, ic, c]) => `<td${f === "m" ? ' class="day"' : ""}><button class="t ${c} ${a[f] ? "on" : ""}" title="${a.by ? "آخر تعديل: " + esc(a.by) + " — " + when(a.at) : ""}" data-id="${k.id}" data-k="${key(d)}" data-f="${f}">${a[f] ? 1 : 0}</button></td>`).join("") + `<td><input class="b" type="number" min="0" value="${a.b || 0}" data-id="${k.id}" data-k="${key(d)}" data-f="b"></td><td class="tot">${t}</td><td><button class="t ph ${a.v ? "on" : ""}" data-id="${k.id}" data-k="${key(d)}" data-f="v" title="افتقاد تليفوني">${a.v ? 1 : 0}</button></td>`; }).join("");
    return `<tr style="--i:${idx}"><td class="nm" data-open="${k.id}"><img class="av" src="${k.photo || AVATAR}">${esc(k.name)}</td>${cells}<td class="tot">${mt}</td><td class="tot ph-c">${pc}/${F.length}</td>${[1, 2, 3].map(n => { const z = k.home?.[hk(n)]; return `<td><button class="hb ${z?.v ? "on" : ""}" data-hid="${k.id}" data-n="${n}" title="${z?.v ? "آخر تعديل: " + esc(z.by) + " — " + when(z.at) : "زيارة منزلية " + n + " من ٣"}">${z?.v ? "✓" : ""}</button></td>`; }).join("")}</tr>`; }).join("");
  $("#tbl").innerHTML = h + (list.length ? "" : `<tr><td colspan="9" class="muted">لا يوجد مخدومين — اضغط «ولد جديد»</td></tr>`) + "</tbody>";
}
function renderBoard(R) {
  const t3 = R.slice(0, 3), order = [t3[1], t3[0], t3[2]].filter(Boolean);
  $("#podium").innerHTML = order.map(k => `<div class="pod p${k.rank}"><span class="cr r${k.rank}">${k.rank === 1 ? I("crown") : k.rank}</span><img src="${k.photo || AVATAR}"><b>${esc(k.name)}</b><div class="pt">${k.pts} نقطة</div></div>`).join("");
  $("#rank").innerHTML = `<thead><tr><th>المركز</th><th class="nm">الاسم</th><th>النقاط</th><th>${I("church")}</th><th>${I("tunic")}</th><th>${I("book")}</th></tr></thead><tbody>` +
    filt(R).map((k, i) => `<tr style="--i:${i}"><td class="rk">${k.rank <= 3 ? `<span class="medal m${k.rank}">${k.rank}</span>` : k.rank}</td><td class="nm" data-open="${k.id}"><img class="av" src="${k.photo || AVATAR}">${esc(k.name)}</td><td class="tot">${k.pts}</td><td>${bar(k.m, "#2ecc8f")}</td><td>${bar(k.t, "#4aa8ff")}</td><td>${bar(k.s, "#b57bff")}</td></tr>`).join("") + "</tbody>";
}
function renderKids(R) {
  $("#grid").innerHTML = filt(R).map(k => `<div class="kc" data-open="${k.id}"><img src="${k.photo || AVATAR}"><b>${esc(k.name)}</b><small>${esc(k.grade || "—")}</small><small>📞 ${esc(k.phoneS || k.phoneF || k.phoneM || "—")}</small></div>`).join("");
}

/* ---------- التفاعلات ---------- */
document.addEventListener("click", e => {
  const hb = e.target.closest(".hb"); if (hb) store.setHome(hb.dataset.hid, +hb.dataset.n, kids.find(x => x.id === hb.dataset.hid).home?.[hk(+hb.dataset.n)]?.v ? 0 : 1);
  if (!e.target.closest(".xl")) $("#xlPop").hidden = true;
  const t = e.target.closest(".t"); if (t) { const k = kids.find(x => x.id === t.dataset.id); store.setAtt(k.id, t.dataset.k, t.dataset.f, k.att?.[t.dataset.k]?.[t.dataset.f] ? 0 : 1); }
  const mb = e.target.closest("[data-i]"); if (mb) { monthIdx = +mb.dataset.i; renderAll(); play($("#v-track")); }
  const o = e.target.closest("[data-open]"); if (o && (e.detail === 2 || o.classList.contains("kc") || o.closest("#rank"))) openKid(o.dataset.open);
});
document.addEventListener("change", e => { const i = e.target.closest("input.b"); if (i) store.setAtt(i.dataset.id, i.dataset.k, "b", Math.max(0, +i.value || 0)); });
$$("aside nav button").forEach(b => b.onclick = () => { view = b.dataset.v; $$("aside nav button").forEach(x => x.classList.toggle("on", x === b)); $$(".view").forEach(v => v.hidden = v.id !== "v-" + view); $("#title").textContent = { track: "المتابعة الأسبوعية", board: "لوحة الشرف والمراكز", kids: "بطاقات المخدومين", log: "سجل النشاط" }[view]; });
$$("aside nav button").forEach(b => b.addEventListener("click", () => { play($("#v-" + b.dataset.v)); play($("#stats")); if (b.dataset.v === "board") confetti(26); }));
$("#search").oninput = e => { q = e.target.value.trim(); renderAll(); };
$("#year").onchange = e => { year = +e.target.value; monthIdx = 0; renderAll(); };
$("#addKid").onclick = async () => { if (await askPw("إضافة مخدوم جديد تحتاج كلمة السر")) openKid(null); };

const dlg = $("#dlg"), form = $("#kidForm");
function openKid(id) {
  editId = id; const k = kids.find(x => x.id === id) || {}; photoData = k.photo || "";
  $("#dTitle").textContent = id ? "بطاقة: " + k.name : "إضافة مخدوم جديد"; $("#delKid").hidden = !id || !isHost(); $("#lastEd").textContent = k.lastBy ? "آخر تعديل: " + k.lastBy + " — " + when(k.lastAt) : ""; $("#pPrev").src = photoData || AVATAR;
  [...form.elements].forEach(el => { if (el.name) el.value = k[el.name] || ""; }); dlg.showModal();
}
$("#closeDlg").onclick = () => dlg.close();
$("#pFile").onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => {
  const c = document.createElement("canvas"), s = 220 / Math.min(img.width, img.height); c.width = c.height = 220;
  c.getContext("2d").drawImage(img, (220 - img.width * s) / 2, (220 - img.height * s) / 2, img.width * s, img.height * s);
  photoData = c.toDataURL("image/jpeg", .75); $("#pPrev").src = photoData; }; img.src = URL.createObjectURL(f); };
form.onsubmit = async e => { if (e.submitter?.value !== "save") return;
  const old = kids.find(x => x.id === editId) || {}, d = { photo: photoData }, ch = [];
  [...form.elements].forEach(el => { if (el.name) { d[el.name] = el.value.trim(); if ((old[el.name] || "") !== d[el.name]) ch.push(el.closest("label").childNodes[0].textContent.trim()); } });
  if ((old.photo || "") !== photoData) ch.push("الصورة");
  if (editId && !ch.length) return;
  d.id = editId || "k" + Date.now(); d.lastBy = userEmail; d.lastAt = Date.now();
  await store.save(d); store.log(editId ? "edit" : "add", d, editId ? "عدّل: " + ch.join("، ") : "أضاف مخدوماً جديداً"); toast("تم الحفظ ✔"); };
$("#delKid").onclick = async () => { if (!isHost()) return toast("الحذف للمسؤول فقط");
  const k = kids.find(x => x.id === editId); if (!await askPw("أدخل كلمة السر لحذف «" + k.name + "»")) return;
  if (confirm("حذف نهائي مع كل درجاته؟")) { await store.remove(editId); store.log("delete", k, "حذف المخدوم نهائياً"); dlg.close(); toast("تم الحذف"); } };
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }

/* ---------- أيقونات وتأثيرات ---------- */
const P = { cross: "M9.5 1h5v8.5H23v5h-8.5V23h-5v-8.5H1v-5h8.5z", church: "M11 1h2v2h2v2h-2v2.2l6 3.3V22H4V10.5l6-3.3V5H9V3h2zM10 22h4v-6a2 2 0 00-4 0z", tunic: "M8 3l4 2.5L16 3l5 4-2.5 3.5L17 9.5V22H7V9.5l-1.5 1L3 7z", book: "M4 3h7.5v17H5a1 1 0 01-1-1zM12.5 3H20v16a1 1 0 01-1 1h-6.5z", star: "M12 2l3 6.5 7 .9-5.1 4.8 1.3 7-6.2-3.4-6.2 3.4 1.3-7L2 9.4l7-.9z", crown: "M2 7l5 4 5-7 5 7 5-4-2 12H4z", out: "M4 3h9v3H7v12h6v3H4zM16 8l5 4-5 4v-3H10v-2h6z" };
function I(n) { return `<svg class="svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="${P[n]}"/></svg>`; }
$$("[data-ic]").forEach(el => el.innerHTML = I(el.dataset.ic));
$("#legend").innerHTML = FIELDS.map(f => `<span class="lg">${I(f[1])} ${f[3]}</span>`).join("") + `<span>${I("star")} بونص</span><span>${I("phone")} افتقاد تليفوني (كل أسبوع)</span><span>${I("home")} افتقاد منزلي (٣ مرات في السنة)</span><span>اضغط الخانة للتبديل • انقر مرتين على الاسم لفتح البطاقة</span>`;
function play(el) { el.classList.remove("anim"); void el.offsetWidth; el.classList.add("anim"); setTimeout(() => el.classList.remove("anim"), 1500); }
function confetti(n) { for (let i = 0; i < n; i++) { const e = document.createElement("i"); e.className = "conf"; e.innerHTML = I(i % 3 ? "cross" : "star");
  e.style.cssText = `left:${Math.random() * 100}vw;--s:${10 + Math.random() * 14}px;--c:${["#d9ab4e", "#f1d38a", "#f3ecd9", "#a32a4b"][i % 4]};--d:${2 + Math.random() * 2}s;--x:${Math.random() * 160 - 80}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * .6}s;width:1em;height:1em`;
  document.body.append(e); setTimeout(() => e.remove(), 5000); } }
$("#float").innerHTML = Array.from({ length: 14 }, () => `<i style="--s:${16 + Math.random() * 30}px;left:${Math.random() * 100}%;animation-duration:${14 + Math.random() * 14}s;animation-delay:-${Math.random() * 20}s">${I("cross")}</i>`).join("");
$$(".auth-card>*").forEach((el, i) => el.style.setProperty("--n", i + 2));

/* ---------- المسؤول وكلمة السر ---------- */
function setupHost() { $("#navLog").hidden = !isHost(); $("#me").innerHTML = `<b>${esc(userEmail)}</b>${isHost() ? '<span class="badge">المسؤول</span>' : ""}`;
  if (!isHost()) return;
  if (LIVE) { unsubLog?.(); unsubLog = fb.onSnapshot(fb.query(fb.collection(db, "logs"), fb.orderBy("ts", "desc"), fb.limit(300)), sn => { logs = sn.docs.map(d => d.data()); renderLog(); }, () => toast("تعذر قراءة السجل — راجع قواعد Firestore")); }
  else logs = JSON.parse(localStorage.getItem("ss_logs") || "[]"); }
function renderLog() { if (!isHost()) return; const L = logs.filter(l => !q || (l.email + l.kid + l.detail).includes(q));
  $("#logTop").textContent = logs[0] ? `آخر تعديل كان من ${logs[0].email} — ${when(logs[0].ts)}` : "لم تُسجَّل أي تعديلات بعد";
  $("#logTbl").innerHTML = `<thead><tr><th>اليوم والساعة</th><th>الإيميل</th><th>المخدوم</th><th>العملية</th></tr></thead><tbody>` +
    (L.map((l, i) => `<tr style="--i:${Math.min(i, 15)}"><td>${when(l.ts)}</td><td class="mail">${esc(l.email)}</td><td>${esc(l.kid)}</td><td class="lt ${l.type}">${esc(l.detail)}</td></tr>`).join("") || `<tr><td colspan="4" class="muted">لا توجد نتائج</td></tr>`) + "</tbody>"; }
function askPw(msg) { return new Promise(res => { const d = $("#pw"); $("#pwMsg").textContent = msg; $("#pwIn").value = ""; $("#pwErr").textContent = ""; d.returnValue = ""; d.showModal(); $("#pwIn").focus();
  $("#pwForm").onsubmit = e => { if (h53($("#pwIn").value) !== PW) { e.preventDefault(); $("#pwErr").textContent = "كلمة السر غير صحيحة"; $("#pwIn").select(); } else res(true); };
  $("#pwNo").onclick = () => d.close(); d.onclose = () => { if (d.returnValue !== "ok") res(false); }; }); }
P.log = "M5 3h14v18H5zM8 7h8v2H8zM8 11h8v2H8zM8 15h5v2H8z";
$$('[data-ic="log"]').forEach(el => el.innerHTML = I("log"));

/* ---------- دليل الاستخدام داخل الموقع ---------- */
const GUIDE = [
  ["cross", "أهلاً بيك في خدمة مدارس الأحد", ["الموقع بديل كشكول الغياب الورقي.", "بتسجّل الحضور والبونص، والترتيب بيتحسب لوحده.", "كل الخدام بيشوفوا نفس البيانات في نفس اللحظة."]],
  ["book", "١ — إنشاء حساب وتسجيل الدخول", ["من صفحة الدخول اضغط «أنشئ حساباً جديداً» واكتب بريدك وكلمة مرور ٦ أحرف على الأقل.", "أو اضغط «الدخول بحساب Google» وهتدخل على طول.", "المرات الجاية سجّل دخولك بنفس البيانات."]],
  ["church", "٢ — المتابعة الأسبوعية", ["اختار الشهر من فوق، هتلاقي جمعاته الحقيقية بالتاريخ.", "قدام كل ولد أربع خانات: القداس، التونية، الخدمة بالضغط (١ حضر، ٠ غاب)، والبونص برقم.", "على الشمال مجموع اليوم ومجموع الشهر."]],
  ["star", "٣ — نظام النقط", ["مجموع اليوم = القداس + التونية + الخدمة (٣ درجات) + البونص.", "البونص تقدير للتفاعل والشطارة والسلوك الهادئ، وممكن يبقى نقطة أو أكتر.", "النسب بتتحسب من الجمع اللي عدّت لحد النهاردة."]],
  ["phone", "٣-ب — الافتقاد", ["الافتقاد التليفوني: خانة في كل أسبوع بعد البونص، اضغطها لو كلمت الولد (يعني ٤ مرات في الشهر).", "الافتقاد المنزلي: ٣ مربعات فاضية في آخر الصف، تعلّم كل مرة تزور فيها الولد خلال السنة كلها.", "الافتقاد منفصل تماماً عن النقط ولوحة الشرف والترتيب."]],
  ["crown", "٤ — لوحة الشرف", ["الترتيب بيتحدث فوراً مع أي تعديل في المتابعة.", "أول ثلاثة على المنصة، والأول بتاج ذهبي.", "الجدول فيه النقاط ونسب القداس والتونية والخدمة."]],
  ["book", "٥ — بطاقة المخدوم: إضافة وتعديل", ["للإضافة اضغط «＋ ولد جديد» واكتب كلمة السر، واملا البطاقة واضغط «حفظ».", "للتعديل اضغط مرتين على الاسم في المتابعة، أو اضغط كارته في تبويب «المخدومين».", "البطاقة فيها الاسم الرباعي والعنوان وتليفونات الأسرة ووظائف الأهل والأخوات وآباء الاعتراف والملاحظات والصورة."]],
  ["cross", "٦ — الحذف وكلمة السر", ["إضافة أي ولد محتاجة كلمة السر.", "الحذف للمسؤول فقط، وبعد كلمة السر وتأكيد نهائي.", "الحذف بيمسح الولد وكل درجاته، فاتأكد قبلها."]],
  ["log", "٧ — المسؤول وسجل النشاط", ["المسؤول بيظهر له تبويب «سجل النشاط» وشارة «المسؤول».", "السجل بيعرض مين عدّل، وإيميله، واليوم والساعة، وإيه اللي اتغيّر.", "ولو وقفت على أي خانة حضور بتشوف آخر من عدّلها."]],
  ["star", "٨ — الاستيراد والتصدير من Excel", ["من زرار «Excel» فوق: حمّل «ملف نموذج»، واملا بيانات الأولاد فيه.", "اختار «استيراد»: الموقع بيضيف الأسماء الجديدة بس ويتجاهل الموجودين بالفعل، بعد كلمة السر.", "«تصدير» بينزّل ملف فيه بيانات كل المخدومين وصفحة تانية بالترتيب والنقاط."]],
  ["star", "٩ — أعياد الميلاد وإضافات", ["فوق الصفحة خانة بتعدّ مواليد الشهر الحالي من تاريخ الميلاد في البطاقة.", "في بحث بالاسم، وزرار «تصدير Excel» لملف فيه الترتيب والنسب.", "اختار السنة الخدمية من القايمة، والموقع بيشتغل على الموبايل."]]
];
let gi = 0;
function gShow(n) { const dir = n >= gi ? 1 : -1; gi = Math.max(0, Math.min(GUIDE.length - 1, n)); const [ic, t, L] = GUIDE[gi];
  $("#gBody").innerHTML = `<div class="gs" style="--d:${dir}"><div class="gic">${I(ic)}</div><h3>${t}</h3><ul>${L.map(x => `<li>${x}</li>`).join("")}</ul></div>`;
  $("#gDots").innerHTML = GUIDE.map((_, i) => `<i class="${i === gi ? "on" : ""}" data-g="${i}"></i>`).join("");
  $("#gPrev").disabled = gi === 0; $("#gNext").textContent = gi === GUIDE.length - 1 ? "إنهاء" : "التالي"; }
const openGuide = e => { e?.preventDefault(); gi = 0; gShow(0); $("#guide").showModal(); };
$("#guideBtn").onclick = openGuide; $("#guideLink").onclick = openGuide;
$("#gClose").onclick = () => $("#guide").close();
$("#gPrev").onclick = () => gShow(gi - 1);
$("#gNext").onclick = () => gi === GUIDE.length - 1 ? $("#guide").close() : gShow(gi + 1);
$("#gDots").onclick = e => { if (e.target.dataset.g) gShow(+e.target.dataset.g); };
$("#guide").addEventListener("keydown", e => { if (e.key === "ArrowLeft") $("#gNext").click(); if (e.key === "ArrowRight") $("#gPrev").click(); });
$$('[data-ic="book"]').forEach(el => el.innerHTML = I("book"));

/* ---------- الافتقاد: أيقونات + تأثيرات ---------- */
Object.assign(P, { phone: "M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25c1.1.37 2.3.57 3.6.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.3.2 2.5.57 3.6a1 1 0 01-.25 1z", home: "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3z", xl: "M5 3h9l5 5v13H5zM13 3v6h6M8 12l5 7M13 12l-5 7" });
$$('[data-ic="xl"]').forEach(el => el.innerHTML = I("xl"));
document.addEventListener("pointerdown", e => { const b = e.target.closest(".btn,.t,.hb,.months button"); if (!b) return; const r = b.getBoundingClientRect(), i = document.createElement("i"), d = Math.max(r.width, r.height) * 2;
  i.className = "rip"; i.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`; b.append(i); setTimeout(() => i.remove(), 600); });
const _ps = [];
function countUp() { $$("#stats .st b").forEach((b, i) => { const v = +b.textContent; if (isNaN(v)) return; const from = _ps[i] ?? 0; _ps[i] = v; if (from === v) return; const t0 = performance.now();
  (function f(t) { const p = Math.min((t - t0) / 800, 1); b.textContent = Math.round(from + (v - from) * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); })(t0); }); }

/* ---------- Excel: استيراد وتصدير ---------- */
const COLS = [["name", "الاسم رباعي"], ["birth", "تاريخ الميلاد"], ["grade", "السنة الدراسية"], ["address", "العنوان"], ["phoneS", "تليفون الولد"], ["phoneF", "تليفون الأب"], ["phoneM", "تليفون الأم"], ["jobF", "وظيفة الأب"], ["jobM", "وظيفة الأم"], ["siblings", "الأخوات"], ["siblingsBirth", "تواريخ ميلاد الأخوات"], ["confS", "أب اعتراف الولد"], ["confF", "أب اعتراف الأب"], ["confM", "أب اعتراف الأم"], ["notes", "ملاحظات"]];
const norm = s => String(s ?? "").replace(/[\u064B-\u065F\u0670]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/\s+/g, " ").trim();
const fixDate = v => { if (v instanceof Date) { const d = new Date(v.getTime() + 43200000); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const t = String(v ?? "").trim(), m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : (/^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : ""); };
let pending = [];
const needX = () => window.XLSX ? true : (toast("تعذر تحميل مكتبة Excel — تأكد من الإنترنت"), false);
$("#xlBtn").onclick = e => { e.stopPropagation(); $("#xlPop").hidden = !$("#xlPop").hidden; };
$("#xlImp").onclick = () => { $("#xlPop").hidden = true; $("#xlFile").click(); };
$("#xlTpl").onclick = () => { $("#xlPop").hidden = true; if (!needX()) return; const ws = XLSX.utils.aoa_to_sheet([COLS.map(c => c[1]), ["مثال: مينا رامز عادل جرجس", "2015-10-03", "الصف الخامس", "المنيا", "0100000000", "0101111111", "0102222222", "مهندس", "معلمة", "مريم", "2012-03-12", "أبونا بيشوي", "", "", ""]]);
  ws["!cols"] = COLS.map(() => ({ wch: 22 })); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "المخدومين"); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, "نموذج-استيراد-المخدومين.xlsx"); };
$("#xlExp").onclick = () => { $("#xlPop").hidden = true; if (!needX()) return;
  const data = kids.map(k => Object.fromEntries(COLS.map(([f, l]) => [l, k[f] || ""])));
  const rank = ranked().map(k => ({ "المركز": k.rank, "الاسم": k.name, "النقاط": k.pts, "القداس %": k.m, "التونية %": k.t, "الخدمة %": k.s }));
  const w1 = XLSX.utils.json_to_sheet(data), w2 = XLSX.utils.json_to_sheet(rank); w1["!cols"] = COLS.map(c => ({ wch: Math.max(16, c[1].length + 4) })); w1["!cols"][0] = { wch: 30 }; w2["!cols"] = [{ wch: 8 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, w1, "بيانات المخدومين"); XLSX.utils.book_append_sheet(wb, w2, "الترتيب والنقاط"); wb.Workbook = { Views: [{ RTL: true }] };
  XLSX.writeFile(wb, "بيانات-مدارس-الأحد-" + new Date().toISOString().slice(0, 10) + ".xlsx"); toast("تم تصدير الملف ✔"); };
$("#xlFile").onchange = async e => { const f = e.target.files[0]; e.target.value = ""; if (!f || !needX()) return;
  const wb = XLSX.read(await f.arrayBuffer(), { type: "array", cellDates: true }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" }), map = {};
  Object.keys(rows[0] || {}).forEach(h => { const n = norm(h), c = COLS.find(c => norm(c[1]) === n || (c[0] === "name" && n === "الاسم")); if (c) map[h] = c[0]; });
  if (!Object.values(map).includes("name")) return toast("مفيش عمود «الاسم رباعي» في الملف");
  const have = new Set(kids.map(k => norm(k.name))), seen = new Set(), fresh = []; let dup = 0;
  rows.forEach(r => { const d = {}; for (const h in map) d[map[h]] = map[h] === "birth" ? fixDate(r[h]) : String(r[h] ?? "").trim(); if (!d.name) return; const n = norm(d.name); if (have.has(n) || seen.has(n)) dup++; else { seen.add(n); fresh.push(d); } });
  pending = fresh; $("#impChips").innerHTML = `<span class="chip ok">جديد: ${fresh.length}</span><span class="chip">موجود بالفعل (هيتجاهل): ${dup}</span>`;
  $("#impList").innerHTML = fresh.map((d, i) => `<div style="--i:${Math.min(i, 20)}">${esc(d.name)}</div>`).join("") || '<p class="muted">مفيش أسماء جديدة في الملف.</p>';
  $("#impGo").disabled = !fresh.length; $("#imp").showModal(); };
$("#impClose").onclick = () => $("#imp").close();
$("#impGo").onclick = async () => { if (!(await askPw("إضافة " + pending.length + " مخدوم جديد من Excel تحتاج كلمة السر"))) return;
  const t = Date.now(); await Promise.all(pending.map((d, i) => store.save({ ...d, id: "k" + t + "_" + i, lastBy: userEmail, lastAt: t })));
  store.log("add", { name: "استيراد Excel", id: "import" }, `استورد ${pending.length} مخدوم جديد: ` + pending.slice(0, 5).map(d => d.name).join("، ") + (pending.length > 5 ? " …" : ""));
  $("#imp").close(); toast(`تمت إضافة ${pending.length} ✔`); confetti(16); };
