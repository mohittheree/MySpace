const $ = id => document.getElementById(id); let authMode = 'login'; let currentUser = null; let cloudMode = false; let activeTable = 'academics'; let editingId = null; const localKey = 'myspace-mvp-data';
const emptyData = () => ({ academics: [], goals: [], achievements: [], projects: [], interests: [], notes: [] }); let data = emptyData();
const definitions = { academics: [['subject','Subject','text'],['exam_name','Assessment / test name','text'],['marks','Score','number'],['max_marks','Maximum score','number'],['date','Date','date'],['notes','Notes','text']], goals: [['title','Goal name','text'],['description','Description','text'],['category','Category','text'],['progress','Progress %','number'],['deadline','Deadline','date']], achievements: [['title','Achievement title','text'],['description','Description','text'],['date','Date','date'],['category','Category','text']], projects: [['title','Project name','text'],['description','Description','text'],['status','Status','text'],['category','Category','text']], interests: [['name','Interest','text'],['category','Category','text']], notes: [['title','Title','text'],['content','Content','text'],['category','Category','text']] };
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); } function localLoad() { try { return { ...emptyData(), ...JSON.parse(localStorage.getItem(localKey) || '{}') }; } catch { return emptyData(); } } function localSave() { localStorage.setItem(localKey, JSON.stringify(data)); }
function displayName() { return profileName() || currentUser?.user_metadata?.display_name?.trim() || currentUser?.email?.split('@')[0] || (cloudMode ? 'MySpace member' : 'Alex Morgan'); } let profile = null; function profileName() { return profile?.display_name?.trim(); }
function updateIdentity() { const name = displayName(); const initials = name.split(/\s+/).map(x => x[0]).join('').slice(0,2).toUpperCase(); $('sidebar-name').textContent = name; $('sidebar-email').textContent = currentUser?.email || 'Local demo'; $('sidebar-avatar').textContent = initials; $('top-avatar').textContent = initials; $('dashboard-greeting').innerHTML = `Good morning, ${escapeHtml(name)} <span class="wave">✦</span>`; }
function showAuth(mode = 'login') { authMode = mode; const recovery = mode === 'recovery'; $('auth-loading').style.display = 'none'; $('auth-screen').hidden = false; document.querySelector('.app-shell').style.display = 'none'; $('auth-title').textContent = recovery ? 'Set a new password.' : mode === 'signup' ? 'Make it yours.' : 'Welcome back.'; $('auth-description').textContent = recovery ? 'Choose a new password for your MySpace account.' : mode === 'signup' ? 'Create a private space for the things that matter to you.' : 'Sign in to keep your personal space in sync across devices.'; $('auth-email').closest('.field').hidden = recovery; $('auth-email').required = !recovery; $('display-name-field').hidden = mode !== 'signup'; $('confirm-password-field').hidden = !recovery; $('auth-password').autocomplete = recovery ? 'new-password' : mode === 'login' ? 'current-password' : 'new-password'; $('auth-submit').textContent = recovery ? 'Update password' : mode === 'signup' ? 'Create account' : 'Sign in'; $('auth-switch').textContent = mode === 'signup' ? 'Sign in' : 'Create an account'; $('auth-switch-copy').textContent = mode === 'signup' ? 'Already have an account?' : 'New to MySpace?'; $('auth-switch').hidden = recovery; $('auth-reset').hidden = mode !== 'login'; $('local-mode-button').hidden = recovery; $('auth-error').textContent = ''; }
async function openSession(session) { if (!session?.user) return showAuth(); currentUser = session.user; cloudMode = true; const p = await MySpaceData.loadProfile(); profile = p.data || null; data = emptyData(); const tables = Object.keys(data); const results = await Promise.all(tables.map(table => MySpaceData.list(table))); results.forEach((result, index) => { if (!result.error) data[tables[index]] = result.data || []; }); updateIdentity(); $('auth-loading').style.display = 'none'; $('auth-screen').hidden = true; document.querySelector('.app-shell').style.display = 'flex'; renderAll(); }
function showLocal() { currentUser = null; cloudMode = false; profile = { display_name: 'Alex Morgan' }; data = localLoad(); updateIdentity(); $('auth-loading').style.display = 'none'; $('auth-screen').hidden = true; document.querySelector('.app-shell').style.display = 'flex'; renderAll(); }
function renderAll() { Object.keys(data).forEach(renderTable); const statValues = document.querySelectorAll('.stat-value'); [data.goals.length, data.projects.length, data.notes.length, data.achievements.length].forEach((value, index) => { if (statValues[index]) statValues[index].textContent = value; }); $('dashboard-list').innerHTML = Object.values(data).flat().slice(0,6).map(item => `<div class="item-row"><strong>${escapeHtml(item.title || item.name || item.subject || 'Saved item')}</strong><span class="muted">${escapeHtml(item.category || item.date || '')}</span></div>`).join('') || '<p class="muted">Nothing saved yet.</p>'; }
function renderTable(table) { const target = $(`${table}-list`); if (!target) return; const rows = data[table] || []; target.innerHTML = rows.length ? rows.map(item => { const title = item.title || item.name || item.subject || item.exam_name || 'Saved item'; const detail = table === 'academics' ? `${item.marks}/${item.max_marks} · ${item.max_marks ? Math.round(item.marks / item.max_marks * 100) : 0}%` : item.description || item.content || item.category || ''; return `<div class="item-row"><div><strong>${escapeHtml(title)}</strong><p class="muted">${escapeHtml(detail)}</p></div><div class="row-actions"><button class="text-button" data-edit="${table}" data-id="${escapeHtml(item.id)}">Edit</button><button class="text-button" data-delete="${table}" data-id="${escapeHtml(item.id)}">Delete</button></div></div>`; }).join('') : '<p class="muted">No entries yet. Add your first one.</p>'; }
function navigate(table) { document.querySelectorAll('.section-view').forEach(view => view.classList.toggle('active', view.id === `section-${table}`)); document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.section === table)); $('breadcrumb-current').textContent = table[0].toUpperCase() + table.slice(1); }
function openForm(table, item = null) { activeTable = table; editingId = item?.id || null; $('modal-title').textContent = editingId ? `Edit ${table.slice(0,-1)}` : `Add ${table.slice(0,-1)}`; $('form-fields').innerHTML = definitions[table].map(([name, label, type]) => `<div class="field"><label for="field-${name}">${label}</label><input id="field-${name}" name="${name}" type="${type}" value="${escapeHtml(item?.[name] || '')}" ${name === 'progress' ? 'min="0" max="100"' : ''} required></div>`).join(''); $('modal-backdrop').hidden = false; $('modal-backdrop').classList.add('open'); }
async function saveItem(event) { event.preventDefault(); const value = Object.fromEntries(new FormData(event.target).entries()); if (activeTable === 'academics') { value.marks = Number(value.marks); value.max_marks = Number(value.max_marks); } if (activeTable === 'goals') value.progress = Number(value.progress); let result; if (cloudMode) result = editingId ? await MySpaceData.update(activeTable, editingId, value) : await MySpaceData.insert(activeTable, value); else { result = { data: { ...value, id: editingId || `${activeTable}-${Date.now()}` } }; if (editingId) data[activeTable] = data[activeTable].map(x => x.id === editingId ? result.data : x); else data[activeTable].unshift(result.data); localSave(); } if (result.error) return alert(result.error.message); if (cloudMode) { const rows = await MySpaceData.list(activeTable); if (rows.error) return alert(rows.error.message); data[activeTable] = rows.data || []; } $('modal-backdrop').hidden = true; $('modal-backdrop').classList.remove('open'); renderAll(); }
async function deleteItem(table, id) { if (!confirm('Remove this item?')) return; if (cloudMode) { const result = await MySpaceData.remove(table, id); if (result.error) return alert(result.error.message); } data[table] = data[table].filter(item => item.id !== id); if (!cloudMode) localSave(); renderAll(); }
async function initialize() { if (!MySpaceData.hasConfig) return showAuth(); try { const result = await MySpaceData.getSession(); if (result.error) throw result.error; if (authMode === 'recovery') return; await openSession(result.data.session); } catch (error) { showAuth(); $('auth-error').textContent = `Could not load your private data: ${error.message || 'Unknown startup error.'}`; } }
function setupPersonalSpaceUI() {
  const sidebar = document.querySelector('.sidebar');
  const nav = sidebar?.querySelector('nav');
  const footer = sidebar?.querySelector('.sidebar-footer');
  const topbar = document.querySelector('.topbar');
  if (!sidebar || !nav || !footer || !topbar) return;

  const oldLabel = sidebar.querySelector('.nav-label');
  if (oldLabel) oldLabel.remove();
  const dashboard = nav.querySelector('[data-section="dashboard"]');
  const academics = nav.querySelector('[data-section="academics"]');
  const homeLabel = document.createElement('div');
  homeLabel.className = 'nav-label';
  homeLabel.textContent = 'Home';
  nav.insertBefore(homeLabel, dashboard);
  const spaceLabel = document.createElement('div');
  spaceLabel.className = 'nav-label';
  spaceLabel.textContent = 'Your space';
  nav.insertBefore(spaceLabel, academics);

  const newSpaceButton = document.createElement('button');
  newSpaceButton.id = 'new-space-button';
  newSpaceButton.className = 'sidebar-action';
  newSpaceButton.type = 'button';
  newSpaceButton.innerHTML = '<span class="sidebar-action-icon">＋</span><span>New Space</span>';
  sidebar.insertBefore(newSpaceButton, footer);

  const future = document.createElement('div');
  future.className = 'sidebar-future';
  future.innerHTML = '<div class="nav-label">Coming later</div><button class="nav-item nav-item-muted" type="button" disabled><span class="nav-icon">✦</span>Ask MySpace</button><button class="nav-item nav-item-muted" type="button" disabled><span class="nav-icon">⚙</span>Settings</button>';
  sidebar.insertBefore(future, footer);

  const closeButton = document.createElement('button');
  closeButton.id = 'sidebar-close';
  closeButton.className = 'sidebar-close icon-button';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Close navigation');
  closeButton.textContent = '×';
  sidebar.insertBefore(closeButton, sidebar.firstChild);

  const menuButton = document.createElement('button');
  menuButton.id = 'menu-button';
  menuButton.className = 'menu-button icon-button';
  menuButton.type = 'button';
  menuButton.setAttribute('aria-label', 'Open navigation');
  menuButton.textContent = '☰';
  topbar.insertBefore(menuButton, topbar.firstChild);

  const overlay = document.createElement('div');
  overlay.className = 'mobile-overlay';
  overlay.id = 'mobile-overlay';
  document.querySelector('.app-shell').appendChild(overlay);
  const closeMobileNav = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  const openMobileNav = () => { sidebar.classList.add('open'); overlay.classList.add('open'); };
  menuButton.addEventListener('click', openMobileNav);
  closeButton.addEventListener('click', closeMobileNav);
  overlay.addEventListener('click', closeMobileNav);
  nav.addEventListener('click', closeMobileNav);

  const backdrop = document.createElement('div');
  backdrop.id = 'new-space-backdrop';
  backdrop.className = 'new-space-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = '<section class="new-space-modal" role="dialog" aria-modal="true" aria-labelledby="new-space-title"><div class="new-space-header"><div><p class="eyebrow">NEW SPACE</p><h2 id="new-space-title">What do you want to save?</h2><p class="new-space-description">Start anywhere. You do not need to decide what it is yet.</p></div><button id="new-space-close" class="icon-button" type="button" aria-label="Close New Space">×</button></div><form id="new-space-form"><label class="new-space-label" for="new-space-input">Tell MySpace anything</label><textarea id="new-space-input" rows="6" placeholder="I started learning Blender today and want to make a short film."></textarea><p id="new-space-status" class="new-space-status" aria-live="polite"></p><div class="new-space-actions"><button id="new-space-cancel" class="secondary-button" type="button">Cancel</button><button class="primary-button" type="submit">Continue</button></div></form></section>';
  document.body.appendChild(backdrop);
  const closeNewSpace = () => { backdrop.hidden = true; document.body.classList.remove('new-space-open'); };
  const openNewSpace = () => { backdrop.hidden = false; document.body.classList.add('new-space-open'); $('new-space-input').focus(); };
  newSpaceButton.addEventListener('click', openNewSpace);
  $('new-space-close').addEventListener('click', closeNewSpace);
  $('new-space-cancel').addEventListener('click', closeNewSpace);
  backdrop.addEventListener('click', event => { if (event.target === backdrop) closeNewSpace(); });
  $('new-space-form').addEventListener('submit', event => { event.preventDefault(); const input = $('new-space-input').value.trim(); if (!input) { $('new-space-status').textContent = 'Write something you want to keep first.'; return; } $('new-space-status').textContent = 'Your capture is ready for future Smart Sorting.'; });
}
setupPersonalSpaceUI();
$('auth-form').addEventListener('submit', async event => { event.preventDefault(); const email = $('auth-email').value.trim(); const password = $('auth-password').value; const name = $('auth-display-name').value; $('auth-submit').disabled = true; try { const result = authMode === 'signup' ? await MySpaceData.signUp(email, password, name) : await MySpaceData.signIn(email, password); if (result.error) throw result.error; if (result.data.session) await openSession(result.data.session); else $('auth-error').textContent = 'Account created. Check your email to confirm, then sign in.'; } catch (error) { $('auth-error').textContent = error.message || 'Something went wrong.'; } finally { $('auth-submit').disabled = false; } });
 $('auth-switch').addEventListener('click', () => showAuth(authMode === 'login' ? 'signup' : 'login')); $('local-mode-button').addEventListener('click', showLocal); $('logout-button').addEventListener('click', async () => { if (cloudMode) await MySpaceData.signOut(); currentUser = null; showAuth(); }); $('item-form').addEventListener('submit', saveItem); const closeModal = () => { $('modal-backdrop').hidden = true; $('modal-backdrop').classList.remove('open'); }; $('modal-close').addEventListener('click', closeModal); $('modal-cancel').addEventListener('click', closeModal); document.addEventListener('click', event => { const nav = event.target.closest('[data-section]'); if (nav) return navigate(nav.dataset.section); const add = event.target.closest('[data-add]'); if (add) return openForm(add.dataset.add); const edit = event.target.closest('[data-edit]'); if (edit) return openForm(edit.dataset.edit, data[edit.dataset.edit].find(item => item.id === edit.dataset.id)); const remove = event.target.closest('[data-delete]'); if (remove) deleteItem(remove.dataset.delete, remove.dataset.id); });
async function requestPasswordReset() { const email = $('auth-email').value.trim(); if (!email) { $('auth-error').textContent = 'Enter your email first.'; $('auth-email').focus(); return; } const button = $('auth-reset'); const original = button.textContent; button.disabled = true; button.textContent = 'Sending…'; $('auth-error').textContent = ''; try { const result = await MySpaceData.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}${window.location.pathname}` }); if (result.error) throw result.error; $('auth-error').textContent = 'Password reset instructions sent. Check your email.'; } catch (error) { $('auth-error').textContent = error.message || 'Could not send password reset email.'; } finally { button.disabled = false; button.textContent = original; } }
$('auth-reset').addEventListener('click', requestPasswordReset);
async function handleRecoverySubmit(event) { if (authMode !== 'recovery') return; event.preventDefault(); event.stopImmediatePropagation(); const password = $('auth-password').value; const confirmation = $('auth-confirm-password').value; if (!password || !confirmation) { $('auth-error').textContent = 'Enter and confirm your new password.'; return; } if (password !== confirmation) { $('auth-error').textContent = 'Passwords do not match.'; return; } const button = $('auth-submit'); button.disabled = true; button.textContent = 'Updating…'; $('auth-error').textContent = ''; try { const result = await MySpaceData.auth.updateUser({ password }); if (result.error) throw result.error; await MySpaceData.signOut(); $('auth-password').value = ''; $('auth-confirm-password').value = ''; showAuth('login'); $('auth-error').textContent = 'Password updated successfully. You can sign in now.'; } catch (error) { $('auth-error').textContent = error.message || 'Could not update your password.'; } finally { button.disabled = false; if (authMode === 'recovery') button.textContent = 'Update password'; } }
$('auth-form').addEventListener('submit', handleRecoverySubmit, true);
MySpaceData.auth.onAuthStateChange((event) => { if (event === 'PASSWORD_RECOVERY') showAuth('recovery'); });
if (MySpaceData.auth.consumeRecoveryCallback()) showAuth('recovery');
initialize();
