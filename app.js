(function () {
const { useState, useEffect, useRef, useCallback, useContext, createContext } = React;
const h = htm.bind(React.createElement);
const C = window.DD_CONFIG || {};
const READY = !!(C.SUPABASE_URL && C.SUPABASE_ANON_KEY);
const sb = READY ? supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } }) : null;
const Ctx = createContext(null);

/* ---------- helpers ---------- */
const ERR = { invalid_or_expired_code: 'That invite code is invalid or has expired.', 'Invalid login credentials': 'Incorrect email or password.', 'User already registered': 'An account with this email already exists.', 'Email not confirmed': 'Please confirm your email first. Check your inbox.' };
const msg = e => { const m = (e && e.message) || String(e); if (/duplicate key/.test(m) && /daily_drops/.test(m)) return 'You’ve already dropped in this group today.'; if (/duplicate key/.test(m) && /username/.test(m)) return 'That username is taken.'; if (/Failed to fetch|NetworkError|Load failed/.test(m)) return 'No connection. Check your internet and try again.'; return ERR[m] || m; };
const q = async p => { const { data, error } = await p; if (error) throw error; return data; };
const toast = m => window.dispatchEvent(new CustomEvent('toast', { detail: m }));
const go = p => { location.hash = '#/' + p; };
const back = () => history.length > 1 ? history.back() : go('home');
const ago = t => { const s = (Date.now() - new Date(t)) / 1e3; if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + 'm ago'; if (s < 86400) return Math.floor(s / 3600) + 'h ago'; return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' }); };
const nice = d => new Date(d + 'T12:00:00').toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
const todayUTC = () => new Date().toISOString().slice(0, 10);
const useHash = () => { const g = () => location.hash.replace(/^#\/?/, ''); const [v, set] = useState(g()); useEffect(() => { const f = () => set(g()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []); return v; };
function useAsync(fn, deps) {
  const [s, set] = useState({ loading: true });
  const run = useCallback(() => { set(x => ({ ...x, loading: true, error: null })); fn().then(data => set({ data })).catch(error => set({ error: msg(error) })); }, deps);
  useEffect(run, [run]);
  return { ...s, reload: run };
}
const urlCache = new Map();
function useImg(bucket, path) {
  const [u, setU] = useState(null);
  useEffect(() => {
    if (!path) { setU(null); return; }
    const k = bucket + '/' + path, c = urlCache.get(k);
    if (c && c.exp > Date.now()) { setU(c.u); return; }
    let ok = true;
    sb.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => { if (ok && data) { urlCache.set(k, { u: data.signedUrl, exp: Date.now() + 3300e3 }); setU(data.signedUrl); } });
    return () => { ok = false; };
  }, [bucket, path]);
  return u;
}
const shrink = (file, max) => new Promise((res, rej) => {
  const i = new Image();
  i.onload = () => { const k = Math.min(1, max / Math.max(i.width, i.height)), c = document.createElement('canvas'); c.width = Math.round(i.width * k); c.height = Math.round(i.height * k); c.getContext('2d').drawImage(i, 0, 0, c.width, c.height); c.toBlob(b => b ? res(b) : rej(new Error('Could not read that photo.')), 'image/jpeg', .85); };
  i.onerror = () => rej(new Error('Could not read that photo.')); i.src = URL.createObjectURL(file);
});
const upload = (path, blob, onP) => new Promise(async (res, rej) => {
  const { data: { session } } = await sb.auth.getSession(), x = new XMLHttpRequest(), f = new FormData();
  x.open('POST', `${C.SUPABASE_URL}/storage/v1/object/drops/${path}`);
  x.setRequestHeader('apikey', C.SUPABASE_ANON_KEY); x.setRequestHeader('Authorization', 'Bearer ' + session.access_token); x.setRequestHeader('x-upsert', 'false');
  x.upload.onprogress = e => e.lengthComputable && onP(e.loaded / e.total);
  x.onload = () => x.status < 300 ? res() : rej(new Error('Upload failed (' + x.status + ').'));
  x.onerror = () => rej(new Error('Failed to fetch'));
  f.append('cacheControl', '3600'); f.append('', blob, 'photo.jpg'); x.send(f);
});

/* ---------- ui bits ---------- */
const IC = { home: 'M3 11l9-8 9 8M5 10v10h14V10', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01', image: 'M4 4h16v16H4zM4 16l4-4 4 4 3-3 5 5M9 9h.01', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', plus: 'M12 5v14M5 12h14', cog: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1', msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' };
const Icon = ({ n }) => h`<svg className="i" viewBox="0 0 24 24" aria-hidden="true"><path d=${IC[n]}/></svg>`;
const Logo = ({ s = 72 }) => h`<span className="logo lg" style=${{ width: s, height: s }}><svg viewBox="0 0 24 24" style=${{ width: '58%', height: '58%' }} fill="#11111B" aria-hidden="true"><path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z"/></svg></span>`;
const Av = ({ p, s = 38 }) => { const u = useImg('avatars', p && p.avatar_path); return h`<span className="av" style=${{ width: s, height: s, fontSize: s * .42 }}>${u ? h`<img src=${u} alt=""/>` : ((p && p.username) || '?')[0].toUpperCase()}</span>`; };
const Photo = ({ path, cls = 'photo' }) => { const u = useImg('drops', path); return u ? h`<img className=${cls} src=${u} alt="Daily drop" loading="lazy"/>` : h`<div className=${'skel ' + cls}></div>`; };
const Skels = ({ n = 2, hgt = 320 }) => Array.from({ length: n }, (_, i) => h`<div key=${i} className="skel" style=${{ height: hgt, marginBottom: 14 }}></div>`);
const Empty = ({ t, d, children }) => h`<div className="empty"><b>${t}</b>${d}${children}</div>`;
const Fail = ({ m, retry }) => h`<div className="screen bare"><${Empty} t="Something went wrong" d=${m}><div style=${{ marginTop: 16 }}><button className="btn ghost sm" onClick=${retry}>Try again</button></div><//></div>`;
const Field = ({ label, type = 'text', value, onChange, ...r }) => {
  const [show, setShow] = useState(false), pw = type === 'password';
  return h`<label>${label}<span className=${pw ? 'pw' : ''}><input type=${pw && show ? 'text' : type} value=${value} onChange=${onChange} ...${r}/>${pw && h`<button type="button" onClick=${() => setShow(!show)}>${show ? 'Hide' : 'Show'}</button>`}</span></label>`;
};
const Toggle = ({ on, onChange, label }) => h`<button type="button" role="switch" aria-checked=${on} aria-label=${label} className=${'tog' + (on ? ' on' : '')} onClick=${() => onChange(!on)}></button>`;
function Toasts() {
  const [m, setM] = useState('');
  useEffect(() => { let t; const f = e => { setM(e.detail); clearTimeout(t); t = setTimeout(() => setM(''), 3200); }; addEventListener('toast', f); return () => removeEventListener('toast', f); }, []);
  return h`<div role="status" aria-live="polite" className=${'toast' + (m ? ' on' : '')}>${m}</div>`;
}
const Splash = () => h`<div className="splash"><${Logo} s=${84}/><h1>DailyDrop</h1><p className="mu">A little piece of everyone’s day.</p></div>`;
const Setup = () => h`<div className="screen bare"><${Logo} s=${56}/><h1 style=${{ marginTop: 18 }}>Almost there</h1><p className="mu" style=${{ margin: '10px 0 18px' }}>This build isn’t connected to a backend yet. Open <b>www/config.js</b>, paste your Supabase project URL and anon key, then run <b>npm run sync</b> and rebuild the app. The README has the exact steps.</p></div>`;

/* ---------- guest screens ---------- */
const Welcome = () => h`<div className="screen bare" style=${{ display: 'grid', alignContent: 'center', gap: 14, minHeight: '100vh' }}>
  <${Logo} s=${72}/><h1 style=${{ fontSize: '2.4rem' }}>A little piece of <span className="gt">everyone’s day.</span></h1>
  <p className="mu">DailyDrop is a private space for your friend group. Share one photo a day, answer a daily question, and keep your memories together.</p>
  <div style=${{ display: 'grid', gap: 10, marginTop: 14 }}><button className="btn" onClick=${() => go('register')}>Create account</button><button className="btn ghost" onClick=${() => go('login')}>Log in</button></div></div>`;

function Login() {
  const [f, setF] = useState({ email: '', password: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const submit = async e => { e.preventDefault(); setErr(''); if (!f.email || !f.password) return setErr('Enter your email and password.'); setBusy(true); try { const { error } = await sb.auth.signInWithPassword({ email: f.email.trim(), password: f.password }); if (error) throw error; } catch (x) { setErr(msg(x)); } setBusy(false); };
  return h`<form className="screen bare" onSubmit=${submit}><button type="button" className="back" onClick=${() => go('welcome')}>‹ Back</button><h1>Welcome back</h1><p className="mu" style=${{ margin: '6px 0 22px' }}>Log in to see what your friends dropped.</p>
    <${Field} label="Email" type="email" autoComplete="email" value=${f.email} onChange=${e => setF({ ...f, email: e.target.value })}/>
    <${Field} label="Password" type="password" autoComplete="current-password" value=${f.password} onChange=${e => setF({ ...f, password: e.target.value })}/>
    <p className="err" role="alert">${err}</p><button className="btn" disabled=${busy}>${busy ? 'Logging in…' : 'Log in'}</button>
    <p className="c sm" style=${{ marginTop: 18 }}><a href="#/forgot" style=${{ color: 'var(--acc2)' }}>Forgot password?</a> · <a href="#/register" style=${{ color: 'var(--acc2)' }}>Create account</a></p></form>`;
}
function Register() {
  const [f, setF] = useState({ username: '', email: '', password: '', confirm: '' }), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [sent, setSent] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const submit = async e => {
    e.preventDefault(); setErr('');
    const un = f.username.trim().toLowerCase(), em = f.email.trim();
    if (!/^[a-z0-9_]{3,20}$/.test(un)) return setErr('Username must be 3–20 characters: letters, numbers or underscores.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) return setErr('Please enter a valid email address.');
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.');
    if (f.password !== f.confirm) return setErr('Passwords do not match.');
    setBusy(true);
    try {
      if (!(await q(sb.rpc('username_available', { u: un })))) throw new Error('That username is taken.');
      const { data, error } = await sb.auth.signUp({ email: em, password: f.password, options: { data: { username: un } } });
      if (error) throw error; if (!data.session) setSent(true);
    } catch (x) { setErr(msg(x)); }
    setBusy(false);
  };
  if (sent) return h`<div className="screen bare"><${Empty} t="Check your email" d="We sent you a confirmation link. Open it, then come back and log in."><div style=${{ marginTop: 16 }}><button className="btn" onClick=${() => go('login')}>Go to log in</button></div><//></div>`;
  return h`<form className="screen bare" onSubmit=${submit}><button type="button" className="back" onClick=${() => go('welcome')}>‹ Back</button><h1>Create your account</h1><p className="mu" style=${{ margin: '6px 0 22px' }}>Your own account, your own password.</p>
    <${Field} label="Username" autoCapitalize="none" autoComplete="username" value=${f.username} onChange=${set('username')}/>
    <${Field} label="Email" type="email" autoComplete="email" value=${f.email} onChange=${set('email')}/>
    <${Field} label="Password (8+ characters)" type="password" autoComplete="new-password" value=${f.password} onChange=${set('password')}/>
    <${Field} label="Confirm password" type="password" autoComplete="new-password" value=${f.confirm} onChange=${set('confirm')}/>
    <p className="err" role="alert">${err}</p><button className="btn" disabled=${busy}>${busy ? 'Creating…' : 'Create account'}</button></form>`;
}
function Forgot() {
  const [em, setEm] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(false), [err, setErr] = useState('');
  const submit = async e => { e.preventDefault(); setErr(''); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.trim())) return setErr('Please enter a valid email address.'); setBusy(true); try { const { error } = await sb.auth.resetPasswordForEmail(em.trim(), { redirectTo: C.RESET_REDIRECT_URL || undefined }); if (error) throw error; setDone(true); } catch (x) { setErr(msg(x)); } setBusy(false); };
  if (done) return h`<div className="screen bare"><${Empty} t="Check your email" d="If an account exists for that address, a reset link is on its way."><div style=${{ marginTop: 16 }}><button className="btn" onClick=${() => go('login')}>Back to log in</button></div><//></div>`;
  return h`<form className="screen bare" onSubmit=${submit}><button type="button" className="back" onClick=${() => go('login')}>‹ Back</button><h1>Reset password</h1><p className="mu" style=${{ margin: '6px 0 22px' }}>We’ll email you a link to choose a new one.</p>
    <${Field} label="Email" type="email" value=${em} onChange=${e => setEm(e.target.value)}/><p className="err" role="alert">${err}</p><button className="btn" disabled=${busy}>${busy ? 'Sending…' : 'Send reset link'}</button></form>`;
}
function Guest() {
  const r = useHash().split('/')[0];
  return r === 'login' ? h`<${Login}/>` : r === 'register' ? h`<${Register}/>` : r === 'forgot' ? h`<${Forgot}/>` : h`<${Welcome}/>`;
}

/* ---------- groups ---------- */
function GroupForms({ onDone }) {
  const [name, setName] = useState(''), [code, setCode] = useState(''), [busy, setBusy] = useState('');
  const create = async e => { e.preventDefault(); if (!name.trim()) return toast('Give your group a name.'); setBusy('c'); try { const id = await q(sb.rpc('create_group', { p_name: name })); onDone(id); toast('Group created'); } catch (x) { toast(msg(x)); } setBusy(''); };
  const join = async e => { e.preventDefault(); if (code.trim().length < 4) return toast('Enter the invite code.'); setBusy('j'); try { const id = await q(sb.rpc('join_group', { p_code: code })); onDone(id); toast('You joined the group'); } catch (x) { toast(msg(x)); } setBusy(''); };
  return h`<div><form className="card" onSubmit=${create}><b>Create a private group</b><div style=${{ height: 10 }}></div><${Field} label="Group name" value=${name} maxLength="40" onChange=${e => setName(e.target.value)}/><button className="btn" disabled=${busy === 'c'}>${busy === 'c' ? 'Creating…' : 'Create group'}</button></form>
    <form className="card" onSubmit=${join}><b>Join with an invite code</b><div style=${{ height: 10 }}></div><${Field} label="Invite code" autoCapitalize="characters" value=${code} onChange=${e => setCode(e.target.value.toUpperCase())}/><button className="btn ghost" disabled=${busy === 'j'}>${busy === 'j' ? 'Joining…' : 'Join group'}</button></form></div>`;
}

/* ---------- posts ---------- */
const EM = ['❤️', '🔥', '😂', '😮', '🥹'];
const DROP = '*, profiles!daily_drops_user_id_fkey(username,avatar_path), reactions(emoji,user_id), comments(count)';
function Comments({ d, me, onClose, onChange }) {
  const c = useAsync(() => q(sb.from('comments').select('id,body,created_at,user_id,profiles(username,avatar_path)').eq('drop_id', d.id).order('created_at')), [d.id]);
  const [t, setT] = useState(''), [busy, setBusy] = useState(false);
  const send = async () => { if (!t.trim()) return; setBusy(true); try { await q(sb.from('comments').insert({ drop_id: d.id, body: t.trim() })); setT(''); c.reload(); onChange(); } catch (e) { toast(msg(e)); } setBusy(false); };
  const del = async id => { try { await q(sb.from('comments').delete().eq('id', id)); c.reload(); onChange(); } catch (e) { toast(msg(e)); } };
  return h`<div className="sheet-bg" onClick=${onClose}><div className="sheet" onClick=${e => e.stopPropagation()}><div className="row sp"><b>Comments</b><button className="back" onClick=${onClose}>Close</button></div>
    ${c.loading && !c.data ? h`<${Skels} n=${2} hgt=${48}/>` : (c.data || []).length === 0 ? h`<${Empty} t="No comments yet" d="Be the first to say something nice."/>` :
      c.data.map(x => h`<div key=${x.id} className="row" style=${{ alignItems: 'flex-start', margin: '12px 0' }}><${Av} p=${x.profiles} s=${32}/><div className="grow"><b>${x.profiles.username}</b> <span className="mu sm">${ago(x.created_at)}</span><div>${x.body}</div></div>${x.user_id === me && h`<button className="back sm" onClick=${() => del(x.id)}>Delete</button>`}</div>`)}
    <div className="row" style=${{ marginTop: 12 }}><input value=${t} placeholder="Add a comment…" maxLength="300" style=${{ margin: 0 }} onChange=${e => setT(e.target.value)} onKeyDown=${e => e.key === 'Enter' && send()}/><button className="btn sm" disabled=${busy} onClick=${send}>Send</button></div></div></div>`;
}
function PostCard({ d, me, reload }) {
  const [open, setOpen] = useState(false);
  const mine = new Set(d.reactions.filter(r => r.user_id === me).map(r => r.emoji));
  const toggle = async e => { try { if (mine.has(e)) await q(sb.from('reactions').delete().match({ drop_id: d.id, user_id: me, emoji: e })); else await q(sb.from('reactions').insert({ drop_id: d.id, emoji: e })); reload(); } catch (x) { toast(msg(x)); } };
  const n = (d.comments && d.comments[0] && d.comments[0].count) || 0;
  return h`<article className="card"><div className="row" style=${{ marginBottom: 12 }}><${Av} p=${d.profiles}/><div className="grow"><b>${d.profiles.username}</b><div className="mu sm">${ago(d.created_at)}</div></div></div>
    <${Photo} path=${d.photo_path}/>${d.caption && h`<p style=${{ marginTop: 12 }}>${d.caption}</p>`}
    <div className="chips">${EM.map(e => { const c = d.reactions.filter(r => r.emoji === e).length; return h`<button key=${e} className=${'chip' + (mine.has(e) ? ' on' : '')} aria-label=${'React ' + e} onClick=${() => toggle(e)}>${e}${c > 0 ? ' ' + c : ''}</button>`; })}
      <button className="chip" onClick=${() => setOpen(true)}>💬 ${n}</button></div>
    ${open && h`<${Comments} d=${d} me=${me} onClose=${() => setOpen(false)} onChange=${reload}/>`}</article>`;
}

/* ---------- main screens ---------- */
function Home() {
  const { me, profile, group } = useContext(Ctx);
  const feed = useAsync(() => q(sb.from('daily_drops').select(DROP).eq('group_id', group.id).order('created_at', { ascending: false }).limit(5)), [group.id]);
  const mine = useAsync(() => q(sb.from('daily_drops').select('id').eq('group_id', group.id).eq('user_id', me).eq('drop_date', todayUTC())), [group.id]);
  const qq = useAsync(() => q(sb.rpc('todays_question')), []);
  const dropped = mine.data && mine.data.length > 0;
  return h`<div className="screen"><div className="row sp"><div className="row"><${Logo} s=${34}/><b style=${{ fontSize: '1.15rem' }}>DailyDrop</b></div><button style=${{ background: 'none', border: 0 }} aria-label="Profile" onClick=${() => go('profile')}><${Av} p=${profile} s=${38}/></button></div>
    <p className="mu" style=${{ margin: '18px 0 2px' }}>${new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>Hi ${profile.username} 👋</h1><p className="mu sm">${group.name}</p>
    <div className="card" style=${{ marginTop: 16, background: 'linear-gradient(135deg,rgba(203,166,247,.22),rgba(167,139,250,.08))' }}><b>${dropped ? 'You dropped today ✓' : 'Ready for today’s drop?'}</b><p className="mu sm" style=${{ margin: '4px 0 12px' }}>${dropped ? 'Come back tomorrow, or see what your friends shared.' : 'One photo and a few words. That’s all.'}</p>
      ${!dropped && h`<button className="btn" onClick=${() => go('create')}>Create today’s drop</button>`}</div>
    <button className="card" style=${{ width: '100%', textAlign: 'left', cursor: 'pointer' }} onClick=${() => go('question')}><div className="mu sm" style=${{ fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Daily question</div><div style=${{ marginTop: 6, fontWeight: 600 }}>${qq.data ? qq.data.text : 'Loading…'}</div></button>
    <h2>Recent from your friends</h2>${feed.loading && !feed.data ? h`<${Skels}/>` : feed.error ? h`<${Empty} t="Couldn’t load posts" d=${feed.error}/>` : feed.data.length === 0 ? h`<${Empty} t="No drops yet" d="Be the first to share a little piece of your day."/>` : feed.data.map(d => h`<${PostCard} key=${d.id} d=${d} me=${me} reload=${feed.reload}/>`)}</div>`;
}
function Feed() {
  const { me, group } = useContext(Ctx);
  const f = useAsync(() => q(sb.from('daily_drops').select(DROP).eq('group_id', group.id).order('created_at', { ascending: false }).limit(50)), [group.id]);
  return h`<div className="screen"><div className="row sp"><h1>Friends feed</h1><button className="btn ghost sm" onClick=${f.reload}>Refresh</button></div><p className="mu sm" style=${{ marginBottom: 16 }}>${group.name}</p>
    ${f.loading && !f.data ? h`<${Skels} n=${3}/>` : f.error ? h`<${Empty} t="Couldn’t load the feed" d=${f.error}><div style=${{ marginTop: 14 }}><button className="btn ghost sm" onClick=${f.reload}>Try again</button></div><//>` : f.data.length === 0 ? h`<${Empty} t="Nothing here yet" d="When someone drops today’s photo it will show up here."/>` : f.data.map(d => h`<${PostCard} key=${d.id} d=${d} me=${me} reload=${f.reload}/>`)}
    <button className="fab" aria-label="Create a drop" onClick=${() => go('create')}><${Icon} n="plus"/></button></div>`;
}
function Create() {
  const { me, group } = useContext(Ctx);
  const [file, setFile] = useState(null), [prev, setPrev] = useState(''), [cap, setCap] = useState(''), [pct, setPct] = useState(null), [err, setErr] = useState('');
  const mine = useAsync(() => q(sb.from('daily_drops').select('id').eq('group_id', group.id).eq('user_id', me).eq('drop_date', todayUTC())), [group.id]);
  const pick = e => { const f = e.target.files[0]; if (!f) return; setFile(f); setPrev(URL.createObjectURL(f)); setErr(''); };
  const publish = async () => {
    if (!file) return setErr('Choose a photo first.'); setErr(''); setPct(0);
    try {
      const blob = await shrink(file, 1600), path = `${group.id}/${me}/${Date.now()}.jpg`;
      await upload(path, blob, p => setPct(Math.round(p * 100)));
      try { await q(sb.from('daily_drops').insert({ group_id: group.id, photo_path: path, caption: cap.trim() })); }
      catch (e) { await sb.storage.from('drops').remove([path]); throw e; }
      toast('Dropped! 🎉'); go('feed');
    } catch (x) { setErr(msg(x)); setPct(null); }
  };
  if (mine.data && mine.data.length) return h`<div className="screen bare"><button className="back" onClick=${back}>‹ Back</button><${Empty} t="You’ve already dropped today" d="One drop a day keeps it special. See you tomorrow!"/></div>`;
  return h`<div className="screen bare"><button className="back" onClick=${back}>‹ Back</button><h1>Today’s drop</h1><p className="mu sm" style=${{ margin: '4px 0 16px' }}>Posting to ${group.name}</p>
    <label className="card c" style=${{ display: 'block', cursor: 'pointer', padding: prev ? 8 : 40 }}>${prev ? h`<img className="photo" src=${prev} alt="Preview"/>` : h`<div><b style=${{ color: 'var(--tx)' }}>Choose a photo</b><div className="mu sm">From your camera or gallery</div></div>`}<input type="file" accept="image/*" hidden onChange=${pick}/></label>
    <label>Caption<textarea maxLength="200" placeholder="A few words about your day…" value=${cap} onChange=${e => setCap(e.target.value)}></textarea></label><p className="mu sm" style=${{ textAlign: 'right', marginTop: -8 }}>${cap.length}/200</p>
    ${pct !== null && h`<div><div className="mu sm">Uploading… ${pct}%</div><div className="bar"><i style=${{ width: pct + '%' }}></i></div></div>`}
    <p className="err" role="alert">${err}</p><button className="btn" disabled=${pct !== null} onClick=${publish}>${pct !== null ? 'Publishing…' : err && file ? 'Try again' : 'Publish my drop'}</button></div>`;
}
function Question() {
  const { me, group } = useContext(Ctx);
  const [t, setT] = useState(''), [busy, setBusy] = useState(false);
  const d = useAsync(async () => { const qs = await q(sb.rpc('todays_question')); const ans = await q(sb.from('question_answers').select('id,answer,user_id,created_at,profiles(username,avatar_path)').eq('question_id', qs.id).eq('group_id', group.id).order('created_at')); return { qs, ans }; }, [group.id]);
  const submit = async () => { if (!t.trim()) return; setBusy(true); try { await q(sb.from('question_answers').upsert({ question_id: d.data.qs.id, group_id: group.id, user_id: me, answer: t.trim() }, { onConflict: 'question_id,group_id,user_id' })); setT(''); d.reload(); toast('Answer saved'); } catch (e) { toast(msg(e)); } setBusy(false); };
  if (d.loading && !d.data) return h`<div className="screen"><${Skels} n=${3} hgt=${90}/></div>`;
  if (d.error) return h`<${Fail} m=${d.error} retry=${d.reload}/>`;
  const mine = d.data.ans.find(a => a.user_id === me), hidden = !mine && group.answers_visibility === 'after_answer';
  return h`<div className="screen"><h1>Daily question</h1><div className="card" style=${{ margin: '16px 0', background: 'linear-gradient(135deg,rgba(203,166,247,.22),rgba(167,139,250,.08))' }}><div className="mu sm" style=${{ fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>${nice(d.data.qs.qdate)}</div><p style=${{ fontSize: '1.2rem', fontWeight: 700, marginTop: 6 }}>${d.data.qs.text}</p></div>
    ${!mine ? h`<div className="card"><label>Your answer<textarea maxLength="300" value=${t} onChange=${e => setT(e.target.value)} placeholder="Type your answer…"></textarea></label><button className="btn" disabled=${busy} onClick=${submit}>${busy ? 'Saving…' : 'Submit answer'}</button></div>` : h`<p className="mu sm">You answered. You can change it below.</p>`}
    <h2>Answers</h2>${hidden ? h`<${Empty} t="Answer to see everyone’s" d="Your group reveals answers once you’ve shared yours."/>` : d.data.ans.length === 0 ? h`<${Empty} t="No answers yet" d="Be the first."/>` : d.data.ans.map(a => h`<div key=${a.id} className="card row" style=${{ alignItems: 'flex-start' }}><${Av} p=${a.profiles}/><div className="grow"><b>${a.profiles.username}</b><div>${a.answer}</div></div></div>`)}
    ${mine && h`<button className="btn ghost sm" onClick=${() => setT(mine.answer)} style=${{ marginTop: 8 }}>Edit my answer</button>`}
    ${mine && t && h`<div style=${{ marginTop: 10 }}><textarea maxLength="300" value=${t} onChange=${e => setT(e.target.value)}></textarea><button className="btn" style=${{ marginTop: 8 }} disabled=${busy} onClick=${submit}>Save changes</button></div>`}</div>`;
}
const Thumb = ({ d }) => { const u = useImg('drops', d.photo_path); return h`<button aria-label=${'Open drop by ' + ((d.profiles && d.profiles.username) || 'friend')} onClick=${() => go('post/' + d.id)}>${u ? h`<img src=${u} alt="" loading="lazy"/>` : h`<div className="skel" style=${{ height: '100%', borderRadius: 0 }}></div>`}</button>`; };
function Memories() {
  const { group } = useContext(Ctx);
  const [month, setMonth] = useState('all');
  const m = useAsync(() => q(sb.from('daily_drops').select('id,photo_path,drop_date,profiles!daily_drops_user_id_fkey(username)').eq('group_id', group.id).order('drop_date', { ascending: false }).order('created_at', { ascending: false }).limit(240)), [group.id]);
  if (m.loading && !m.data) return h`<div className="screen"><h1>Memories</h1><div style=${{ height: 16 }}></div><${Skels} n=${2} hgt=${120}/></div>`;
  if (m.error) return h`<${Fail} m=${m.error} retry=${m.reload}/>`;
  const months = [...new Set(m.data.map(d => d.drop_date.slice(0, 7)))], list = month === 'all' ? m.data : m.data.filter(d => d.drop_date.startsWith(month));
  const days = [...new Set(list.map(d => d.drop_date))];
  return h`<div className="screen"><div className="row sp"><h1>Memories</h1>${months.length > 1 && h`<select aria-label="Month" value=${month} style=${{ width: 'auto', margin: 0 }} onChange=${e => setMonth(e.target.value)}><option value="all">All time</option>${months.map(x => h`<option key=${x} value=${x}>${new Date(x + '-15').toLocaleDateString([], { month: 'long', year: 'numeric' })}</option>`)}</select>`}</div>
    ${list.length === 0 ? h`<${Empty} t="No memories yet" d="Your group’s drops will collect here, day by day."/>` : days.map(day => h`<div key=${day}><h2>${nice(day)}</h2><div className="grid">${list.filter(d => d.drop_date === day).map(d => h`<${Thumb} key=${d.id} d=${d}/>`)}</div></div>`)}</div>`;
}
function PostView({ id }) {
  const { me } = useContext(Ctx);
  const p = useAsync(() => q(sb.from('daily_drops').select(DROP).eq('id', id).single()), [id]);
  return h`<div className="screen bare"><button className="back" onClick=${back}>‹ Back</button>${p.loading && !p.data ? h`<${Skels} n=${1} hgt=${420}/>` : p.error ? h`<${Empty} t="Couldn’t open this drop" d=${p.error}/>` : h`<div><p className="mu sm" style=${{ marginBottom: 10 }}>${nice(p.data.drop_date)}</p><${PostCard} d=${p.data} me=${me} reload=${p.reload}/></div>`}</div>`;
}
function Profile() {
  const { me, profile } = useContext(Ctx);
  const d = useAsync(() => q(sb.from('daily_drops').select('id,photo_path,drop_date,profiles!daily_drops_user_id_fkey(username)').eq('user_id', me).order('created_at', { ascending: false }).limit(90)), [me]);
  return h`<div className="screen"><div className="row sp"><h1>Profile</h1><button className="btn ghost sm" onClick=${() => go('settings')}>Settings</button></div>
    <div className="c" style=${{ margin: '20px 0' }}><div style=${{ display: 'inline-block' }}><${Av} p=${profile} s=${92}/></div><h1 style=${{ marginTop: 10 }}>@${profile.username}</h1><p className="mu" style=${{ marginTop: 4 }}>${profile.bio || 'No bio yet.'}</p></div>
    <div className="card c"><div style=${{ fontSize: '1.6rem', fontWeight: 800 }} className="gt">${d.data ? d.data.length : '–'}</div><div className="mu sm">drops shared</div></div>
    <h2>My drops</h2>${d.loading && !d.data ? h`<${Skels} n=${1} hgt=${110}/>` : d.error ? h`<${Empty} t="Couldn’t load" d=${d.error}/>` : d.data.length === 0 ? h`<${Empty} t="No drops yet" d="Your daily photos will appear here."><div style=${{ marginTop: 14 }}><button className="btn sm" onClick=${() => go('create')}>Create a drop</button></div><//>` : h`<div className="grid">${d.data.map(x => h`<${Thumb} key=${x.id} d=${x}/>`)}</div>`}</div>`;
}

/* ---------- settings ---------- */
function Section({ t, children }) { return h`<div><h2>${t}</h2>${children}</div>`; }
function EditProfile() {
  const { me, profile, refresh } = useContext(Ctx);
  const [u, setU] = useState(profile.username), [b, setB] = useState(profile.bio), [busy, setBusy] = useState(false);
  const save = async () => { const un = u.trim().toLowerCase(); if (!/^[a-z0-9_]{3,20}$/.test(un)) return toast('Username: 3–20 letters, numbers or underscores.'); setBusy(true); try { await q(sb.from('profiles').update({ username: un, bio: b.trim() }).eq('id', me)); toast('Saved'); refresh(); } catch (e) { toast(msg(e)); } setBusy(false); };
  const pick = async e => { const f = e.target.files[0]; if (!f) return; try { const blob = await shrink(f, 800), path = `${me}/avatar-${Date.now()}.jpg`; const { error } = await sb.storage.from('avatars').upload(path, blob, { contentType: 'image/jpeg' }); if (error) throw error; const old = profile.avatar_path; await q(sb.from('profiles').update({ avatar_path: path }).eq('id', me)); if (old) await sb.storage.from('avatars').remove([old]); refresh(); toast('Photo updated'); } catch (x) { toast(msg(x)); } };
  return h`<div className="card"><div className="row" style=${{ marginBottom: 14 }}><${Av} p=${profile} s=${64}/><label className="btn ghost sm" style=${{ margin: 0, cursor: 'pointer' }}>Change photo<input type="file" accept="image/*" hidden onChange=${pick}/></label></div>
    <${Field} label="Username" autoCapitalize="none" value=${u} onChange=${e => setU(e.target.value)}/><label>Short bio<textarea maxLength="160" value=${b} onChange=${e => setB(e.target.value)}></textarea></label><button className="btn" disabled=${busy} onClick=${save}>${busy ? 'Saving…' : 'Save profile'}</button></div>`;
}
function GroupSettings() {
  const { me, group, groups, setGroup, refresh } = useContext(Ctx);
  const isAdmin = group.role === 'admin', [more, setMore] = useState(false);
  const mem = useAsync(() => q(sb.from('group_members').select('user_id,role,profiles(username,avatar_path)').eq('group_id', group.id).order('joined_at')), [group.id]);
  const inv = useAsync(() => isAdmin ? q(sb.from('invitations').select('*').eq('group_id', group.id).eq('revoked', false).gt('expires_at', new Date().toISOString()).order('expires_at', { ascending: false }).limit(1)) : Promise.resolve([]), [group.id, isAdmin]);
  const newInvite = async () => { try { await q(sb.from('invitations').update({ revoked: true }).eq('group_id', group.id)); await q(sb.from('invitations').insert({ group_id: group.id, created_by: me })); inv.reload(); toast('New invite code created'); } catch (e) { toast(msg(e)); } };
  const share = async code => { const text = `Join my private DailyDrop group “${group.name}” with the code ${code}`; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Copied to clipboard'); } } catch (e) {} };
  const remove = async uid => { try { await q(sb.from('group_members').delete().match({ group_id: group.id, user_id: uid })); mem.reload(); } catch (e) { toast(msg(e)); } };
  const promote = async uid => { try { await q(sb.from('group_members').update({ role: 'admin' }).match({ group_id: group.id, user_id: uid })); mem.reload(); } catch (e) { toast(msg(e)); } };
  const vis = async v => { try { await q(sb.from('groups').update({ answers_visibility: v }).eq('id', group.id)); refresh(); } catch (e) { toast(msg(e)); } };
  const leave = async () => {
    const admins = (mem.data || []).filter(m => m.role === 'admin'), others = (mem.data || []).length > 1;
    if (isAdmin && admins.length === 1 && others) return toast('Make another member an admin before you leave.');
    if (!confirm('Leave “' + group.name + '”?')) return;
    try { await q(sb.from('group_members').delete().match({ group_id: group.id, user_id: me })); localStorage.removeItem('dd_group'); refresh(); } catch (e) { toast(msg(e)); }
  };
  const creator = (mem.data || []).find(m => m.user_id === group.created_by);
  return h`<div><div className="card"><div className="row sp"><div><b>${group.name}</b><div className="mu sm">Created by ${creator ? '@' + creator.profiles.username : 'a former member'} · you are ${group.role}</div></div></div>
    ${groups.length > 1 && h`<label style=${{ marginTop: 12 }}>Switch group<select value=${group.id} onChange=${e => setGroup(e.target.value)}>${groups.map(g => h`<option key=${g.id} value=${g.id}>${g.name}</option>`)}</select></label>`}</div>
    <div className="card"><b>Members</b>${mem.loading && !mem.data ? h`<${Skels} n=${2} hgt=${40}/>` : (mem.data || []).map(m => h`<div key=${m.user_id} className="row" style=${{ margin: '12px 0 0' }}><${Av} p=${m.profiles} s=${34}/><div className="grow">@${m.profiles.username} ${m.role === 'admin' && h`<span className="mu sm">· admin</span>`}</div>${isAdmin && m.user_id !== me && h`<span className="row">${m.role !== 'admin' && h`<button className="btn ghost sm" onClick=${() => promote(m.user_id)}>Make admin</button>`}<button className="btn bad sm" onClick=${() => remove(m.user_id)}>Remove</button></span>`}</div>`)}</div>
    ${isAdmin && h`<div className="card"><b>Invite friends</b><p className="mu sm" style=${{ margin: '4px 0 10px' }}>Only people with this code can join. It expires after 14 days or 20 uses.</p>${inv.data && inv.data[0] ? h`<div><div style=${{ fontSize: '1.7rem', fontWeight: 800, letterSpacing: '.18em', margin: '6px 0' }} className="gt">${inv.data[0].code}</div><div className="row"><button className="btn sm" onClick=${() => share(inv.data[0].code)}>Share</button><button className="btn ghost sm" onClick=${newInvite}>New code</button></div></div>` : h`<button className="btn sm" onClick=${newInvite}>Create invite code</button>`}</div>
    <div className="card"><div className="row sp"><div><b>Reveal answers immediately</b><div className="mu sm">Off: members see others’ answers only after answering.</div></div><${Toggle} label="Reveal answers immediately" on=${group.answers_visibility === 'always'} onChange=${v => vis(v ? 'always' : 'after_answer')}/></div></div>`}
    <button className="btn bad" onClick=${leave}>Leave group</button><button className="btn ghost" style=${{ marginTop: 10 }} onClick=${() => setMore(!more)}>${more ? 'Hide' : 'Create or join another group'}</button>
    ${more && h`<div style=${{ marginTop: 12 }}><${GroupForms} onDone=${id => { setGroup(id); refresh(); setMore(false); }}/></div>`}</div>`;
}
const PREFS = [['new_drop', 'A friend posts a new drop'], ['reactions', 'Someone reacts to my post'], ['comments', 'Someone comments on my post'], ['question', 'A new daily question'], ['invites', 'Invitations to join a group']];
function Notifs() {
  const { me, profile, refresh } = useContext(Ctx);
  const set = async (k, v) => { try { await q(sb.from('profiles').update({ prefs: { ...profile.prefs, [k]: v } }).eq('id', me)); refresh(); } catch (e) { toast(msg(e)); } };
  return h`<div className="card">${PREFS.map(([k, l]) => h`<div key=${k} className="row sp" style=${{ padding: '8px 0' }}><span>${l}</span><${Toggle} label=${l} on=${!!profile.prefs[k]} onChange=${v => set(k, v)}/></div>`)}<p className="mu sm" style=${{ marginTop: 8 }}>Your choices are saved to your account. Delivering push notifications needs a Firebase setup (see README).</p></div>`;
}
function Password() {
  const [p, setP] = useState(''), [c, setC] = useState(''), [busy, setBusy] = useState(false);
  const save = async () => { if (p.length < 8) return toast('Password must be at least 8 characters.'); if (p !== c) return toast('Passwords do not match.'); setBusy(true); try { const { error } = await sb.auth.updateUser({ password: p }); if (error) throw error; setP(''); setC(''); toast('Password changed'); } catch (e) { toast(msg(e)); } setBusy(false); };
  return h`<div className="card"><${Field} label="New password" type="password" autoComplete="new-password" value=${p} onChange=${e => setP(e.target.value)}/><${Field} label="Confirm new password" type="password" autoComplete="new-password" value=${c} onChange=${e => setC(e.target.value)}/><button className="btn" disabled=${busy} onClick=${save}>${busy ? 'Saving…' : 'Change password'}</button></div>`;
}
function Danger() {
  const { me, profile } = useContext(Ctx);
  const [t, setT] = useState(''), [busy, setBusy] = useState(false);
  const del = async () => {
    if (t !== 'DELETE') return toast('Type DELETE to confirm.'); setBusy(true);
    try {
      const mine = await q(sb.from('daily_drops').select('photo_path').eq('user_id', me));
      if (mine.length) await sb.storage.from('drops').remove(mine.map(x => x.photo_path));
      if (profile.avatar_path) await sb.storage.from('avatars').remove([profile.avatar_path]);
      await q(sb.rpc('delete_my_account')); await sb.auth.signOut();
    } catch (e) { toast(msg(e)); setBusy(false); }
  };
  return h`<div><button className="btn ghost" onClick=${() => sb.auth.signOut()}>Log out</button>
    <div className="card" style=${{ marginTop: 14, borderColor: 'rgba(243,139,168,.4)' }}><b style=${{ color: 'var(--bad)' }}>Delete account</b><p className="mu sm" style=${{ margin: '4px 0 10px' }}>This permanently deletes your account, photos, comments and answers. It can’t be undone.</p><${Field} label="Type DELETE to confirm" value=${t} onChange=${e => setT(e.target.value)}/><button className="btn bad" disabled=${busy} onClick=${del}>${busy ? 'Deleting…' : 'Delete my account'}</button></div></div>`;
}
const Settings = () => h`<div className="screen bare"><button className="back" onClick=${back}>‹ Back</button><h1>Settings</h1>
  <${Section} t="Edit profile"><${EditProfile}/><//><${Section} t="Group & privacy"><${GroupSettings}/><//><${Section} t="Notifications"><${Notifs}/><//><${Section} t="Change password"><${Password}/><//><${Section} t="Account"><${Danger}/><//></div>`;

/* ---------- shell ---------- */
const TABS = [['home', 'Home', 'home'], ['feed', 'Feed', 'users'], ['question', 'Question', 'help'], ['memories', 'Memories', 'image'], ['profile', 'Profile', 'user']];
function Authed({ session }) {
  const me = session.user.id, r = useHash();
  const prof = useAsync(() => q(sb.from('profiles').select('*').eq('id', me).single()), [me]);
  const grp = useAsync(() => q(sb.from('group_members').select('role,groups(id,name,created_by,answers_visibility)').eq('user_id', me)), [me]);
  const [gid, setGid] = useState(localStorage.dd_group || '');
  const refresh = () => { prof.reload(); grp.reload(); };
  const setGroup = id => { localStorage.dd_group = id; setGid(id); };
  if ((prof.error || grp.error) && !(prof.data && grp.data)) return h`<${Fail} m=${prof.error || grp.error} retry=${refresh}/>`;
  if (!prof.data || !grp.data) return h`<${Splash}/>`;
  const groups = grp.data.map(m => ({ ...m.groups, role: m.role })), group = groups.find(g => g.id === gid) || groups[0];
  if (!group) return h`<div className="screen bare"><${Logo} s=${52}/><h1 style=${{ margin: '16px 0 6px' }}>Join your friends</h1><p className="mu" style=${{ marginBottom: 18 }}>DailyDrop works in private groups. Create one for your friends, or enter the invite code someone shared with you.</p><${GroupForms} onDone=${id => { setGroup(id); refresh(); }}/><div style=${{ height: 8 }}></div><button className="btn ghost" onClick=${() => sb.auth.signOut()}>Log out</button></div>`;
  const [page, arg] = r.split('/'), p = page || 'home';
  const screens = { home: h`<${Home}/>`, feed: h`<${Feed}/>`, question: h`<${Question}/>`, memories: h`<${Memories}/>`, profile: h`<${Profile}/>`, create: h`<${Create}/>`, settings: h`<${Settings}/>`, post: h`<${PostView} id=${arg}/>` };
  return h`<${Ctx.Provider} value=${{ me, profile: prof.data, group, groups, setGroup, refresh }}>
    <div key=${p + group.id}>${screens[p] || screens.home}</div>
    ${TABS.some(t => t[0] === p) && h`<nav className="tabbar" aria-label="Main"><div>${TABS.map(([k, l, i]) => h`<button key=${k} className=${'tab' + (p === k ? ' on' : '')} aria-current=${p === k ? 'page' : undefined} onClick=${() => go(k)}><${Icon} n=${i}/>${l}</button>`)}</div></nav>`}<//>`;
}
function App() {
  const [splash, setSplash] = useState(true), [session, setSession] = useState(undefined);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1500);
    if (!sb) return () => clearTimeout(t);
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: l } = sb.auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) location.hash = '#/welcome'; });
    return () => { clearTimeout(t); l.subscription.unsubscribe(); };
  }, []);
  if (!READY) return h`<${Setup}/>`;
  if (splash || session === undefined) return h`<${Splash}/>`;
  return h`<${Toasts}/>${session ? h`<${Authed} session=${session}/>` : h`<${Guest}/>`}`;
}
ReactDOM.createRoot(document.getElementById('root')).render(h`<${App}/>`);
})();
