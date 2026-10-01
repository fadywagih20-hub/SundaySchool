
/* ====== 1) ضع إعدادات مشروع Firebase هنا (Project settings > Web app) ====== */
const firebaseConfig = { apiKey: "", authDomain: "", projectId: "", appId: "" };
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
const store = {
  async save(k) { LIVE ? await fb.setDoc(fb.doc(col, k.id), k, { merge: true }) : (local(k.id, k), emit()); },
  async remove(id) { LIVE ? await fb.deleteDoc(fb.doc(col, id)) : (kids = kids.filter(x => x.id !== id), persist(), emit()); },
  async setAtt(id, key, f, v) {
    const k = kids.find(x => x.id === id);
    if (LIVE) return fb.setDoc(fb.doc(col, id), { att: { [key]: { [f]: v } } }, { merge: true });
    ((k.att ??= {})[key] ??= {})[f] = v; persist(); emit();
  }
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
  setTimeout(() => { $("#auth").hidden = true; $("#app").hidden = false; $("#app").classList.add("in"); renderAll(); play($("#v-track")); play($("#stats")); confetti(24); }, 450); }

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
$("#googleBtn").onclick = async () => { if (!LIVE) { localStorage.setItem("ss_user", "demo"); return enter(); }
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
  renderTrack(R); renderBoard(R); renderKids(R);
}
function renderTrack(R) {
  const ms = svcMonths(); $("#months").innerHTML = ms.map(({ m, y }, i) => `<button class="${i === monthIdx ? "on" : ""}" data-i="${i}">${MONTHS[m]} ${y}</button>`).join("");
  const { m, y } = ms[monthIdx], F = fridays(y, m), list = filt([...kids].sort((a, b) => a.name.localeCompare(b.name, "ar")));
  let h = `<thead><tr><th class="nm" rowspan="2">الاسم</th>${F.map(d => `<th colspan="5" class="day">${d.getDate()} ${MONTHS[m]}</th>`).join("")}<th rowspan="2">إجمالي الشهر</th></tr><tr>${F.map(() => FIELDS.map(f => `<th title="${f[3]}">${I(f[1])}</th>`).join("") + "<th>" + I("star") + "</th><th>Σ</th>").join("")}</tr></thead><tbody>`;
  h += list.map((k, idx) => { let mt = 0; const cells = F.map(d => { const a = k.att?.[key(d)] || {}, t = dayTotal(a); mt += t;
    return FIELDS.map(([f, ic, c]) => `<td${f === "m" ? ' class="day"' : ""}><button class="t ${c} ${a[f] ? "on" : ""}" data-id="${k.id}" data-k="${key(d)}" data-f="${f}">${a[f] ? 1 : 0}</button></td>`).join("") + `<td><input class="b" type="number" min="0" value="${a.b || 0}" data-id="${k.id}" data-k="${key(d)}" data-f="b"></td><td class="tot">${t}</td>`; }).join("");
    return `<tr style="--i:${idx}"><td class="nm" data-open="${k.id}"><img class="av" src="${k.photo || AVATAR}">${esc(k.name)}</td>${cells}<td class="tot">${mt}</td></tr>`; }).join("");
  $("#tbl").innerHTML = h + (list.length ? "" : `<tr><td colspan="9" class="muted">لا يوجد مخدومين — اضغط «ولد جديد»</td></tr>`) + "</tbody>";
}
function renderBoard(R) {
  const t3 = R.slice(0, 3), order = [t3[1], t3[0], t3[2]].filter(Boolean);
  $("#podium").innerHTML = order.map(k => `<div class="pod p${k.rank}"><span class="cr r${k.rank}">${k.rank === 1 ? I("crown") : k.rank}</span><img src="${k.photo || AVATAR}"><b>${esc(k.name)}</b><div class="pt">${k.pts} نقطة</div></div>`).join("");
  $("#rank").innerHTML = `<thead><tr><th>المركز</th><th class="nm">الاسم</th><th>النقاط</th><th>${I("church")}</th><th>${I("tunic")}</th><th>${I("book")}</th></tr></thead><tbody>` +
    filt(R).map((k, i) => `<tr style="--i:${i}"><td class="rk">${k.rank <= 3 ? `<span class="medal m${k.rank}">${k.rank}</span>` : k.rank}</td><td class="nm" data-open="${k.id}"><img class="av" src="${k.photo || AVATAR}">${esc(k.name)}</td><td class="tot">${k.pts}</td><td>${bar(k.m, "#2ecc8f")}</td><td>${bar(k.t, "#4aa8ff")}</td><td>${bar(k.s, "#b57bff")}</td></tr>`).join("") + "</tbody>";
}
function renderKids(R) {
  $("#grid").innerHTML = filt(R).map(k => `<div class="kc" data-open="${k.id}"><img src="${k.photo || AVATAR}"><b>${esc(k.name)}</b><small>${esc(k.grade || "—")}</small><small>📞 ${esc(k.phoneF || k.phoneM || "—")}</small></div>`).join("");
}

/* ---------- التفاعلات ---------- */
document.addEventListener("click", e => {
  const t = e.target.closest(".t"); if (t) { const k = kids.find(x => x.id === t.dataset.id); store.setAtt(k.id, t.dataset.k, t.dataset.f, k.att?.[t.dataset.k]?.[t.dataset.f] ? 0 : 1); }
  const mb = e.target.closest("[data-i]"); if (mb) { monthIdx = +mb.dataset.i; renderAll(); play($("#v-track")); }
  const o = e.target.closest("[data-open]"); if (o && (e.detail === 2 || o.classList.contains("kc") || o.closest("#rank"))) openKid(o.dataset.open);
});
document.addEventListener("change", e => { const i = e.target.closest("input.b"); if (i) store.setAtt(i.dataset.id, i.dataset.k, "b", Math.max(0, +i.value || 0)); });
$$("aside nav button").forEach(b => b.onclick = () => { view = b.dataset.v; $$("aside nav button").forEach(x => x.classList.toggle("on", x === b)); $$(".view").forEach(v => v.hidden = v.id !== "v-" + view); $("#title").textContent = { track: "المتابعة الأسبوعية", board: "لوحة الشرف والمراكز", kids: "بطاقات المخدومين" }[view]; });
$$("aside nav button").forEach(b => b.addEventListener("click", () => { play($("#v-" + b.dataset.v)); play($("#stats")); if (b.dataset.v === "board") confetti(26); }));
$("#search").oninput = e => { q = e.target.value.trim(); renderAll(); };
$("#year").onchange = e => { year = +e.target.value; monthIdx = 0; renderAll(); };
$("#addKid").onclick = () => openKid(null);

const dlg = $("#dlg"), form = $("#kidForm");
function openKid(id) {
  editId = id; const k = kids.find(x => x.id === id) || {}; photoData = k.photo || "";
  $("#dTitle").textContent = id ? "بطاقة: " + k.name : "إضافة مخدوم جديد"; $("#delKid").hidden = !id; $("#pPrev").src = photoData || AVATAR;
  [...form.elements].forEach(el => { if (el.name) el.value = k[el.name] || ""; }); dlg.showModal();
}
$("#closeDlg").onclick = () => dlg.close();
$("#pFile").onchange = e => { const f = e.target.files[0]; if (!f) return; const img = new Image(); img.onload = () => {
  const c = document.createElement("canvas"), s = 220 / Math.min(img.width, img.height); c.width = c.height = 220;
  c.getContext("2d").drawImage(img, (220 - img.width * s) / 2, (220 - img.height * s) / 2, img.width * s, img.height * s);
  photoData = c.toDataURL("image/jpeg", .75); $("#pPrev").src = photoData; }; img.src = URL.createObjectURL(f); };
form.onsubmit = async e => { if (e.submitter?.value !== "save") return;
  const d = { photo: photoData }; [...form.elements].forEach(el => { if (el.name) d[el.name] = el.value.trim(); });
  d.id = editId || "k" + Date.now(); await store.save(d); toast("تم الحفظ ✔"); };
$("#delKid").onclick = async () => { if (confirm("حذف هذا المخدوم نهائياً مع كل درجاته؟")) { await store.remove(editId); dlg.close(); toast("تم الحذف"); } };
$("#csv").onclick = () => { const rows = [["المركز", "الاسم", "النقاط", "القداس%", "التونية%", "الخدمة%", "هاتف الأب", "هاتف الأم"], ...ranked().map(k => [k.rank, k.name, k.pts, k.m, k.t, k.s, k.phoneF || "", k.phoneM || ""])];
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + rows.map(r => r.join(",")).join("\n")], { type: "text/csv" })); a.download = "sunday-school.csv"; a.click(); };
function toast(t) { const el = $("#toast"); el.textContent = t; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 1800); }

/* ---------- أيقونات وتأثيرات ---------- */
const P = { cross: "M9.5 1h5v8.5H23v5h-8.5V23h-5v-8.5H1v-5h8.5z", church: "M11 1h2v2h2v2h-2v2.2l6 3.3V22H4V10.5l6-3.3V5H9V3h2zM10 22h4v-6a2 2 0 00-4 0z", tunic: "M8 3l4 2.5L16 3l5 4-2.5 3.5L17 9.5V22H7V9.5l-1.5 1L3 7z", book: "M4 3h7.5v17H5a1 1 0 01-1-1zM12.5 3H20v16a1 1 0 01-1 1h-6.5z", star: "M12 2l3 6.5 7 .9-5.1 4.8 1.3 7-6.2-3.4-6.2 3.4 1.3-7L2 9.4l7-.9z", crown: "M2 7l5 4 5-7 5 7 5-4-2 12H4z", out: "M4 3h9v3H7v12h6v3H4zM16 8l5 4-5 4v-3H10v-2h6z" };
function I(n) { return `<svg class="svg" viewBox="0 0 24 24" fill="currentColor"><path fill-rule="evenodd" d="${P[n]}"/></svg>`; }
$$("[data-ic]").forEach(el => el.innerHTML = I(el.dataset.ic));
$("#legend").innerHTML = FIELDS.map(f => `<span class="lg">${I(f[1])} ${f[3]}</span>`).join("") + `<span>${I("star")} بونص</span><span>اضغط الخانة للتبديل • انقر مرتين على الاسم لفتح البطاقة</span>`;
function play(el) { el.classList.remove("anim"); void el.offsetWidth; el.classList.add("anim"); setTimeout(() => el.classList.remove("anim"), 1500); }
function confetti(n) { for (let i = 0; i < n; i++) { const e = document.createElement("i"); e.className = "conf"; e.innerHTML = I(i % 3 ? "cross" : "star");
  e.style.cssText = `left:${Math.random() * 100}vw;--s:${10 + Math.random() * 14}px;--c:${["#d9ab4e", "#f1d38a", "#f3ecd9", "#a32a4b"][i % 4]};--d:${2 + Math.random() * 2}s;--x:${Math.random() * 160 - 80}px;--r:${Math.random() * 720}deg;animation-delay:${Math.random() * .6}s;width:1em;height:1em`;
  document.body.append(e); setTimeout(() => e.remove(), 5000); } }
$("#float").innerHTML = Array.from({ length: 14 }, () => `<i style="--s:${16 + Math.random() * 30}px;left:${Math.random() * 100}%;animation-duration:${14 + Math.random() * 14}s;animation-delay:-${Math.random() * 20}s">${I("cross")}</i>`).join("");
$$(".auth-card>*").forEach((el, i) => el.style.setProperty("--n", i + 2));
