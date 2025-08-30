// popup.js - runs when popup opens
document.addEventListener('DOMContentLoaded', init);

function $(id){ return document.getElementById(id); }

function init(){
  // elements
  const addBtn = $('add-note-btn');
  const noteInput = $('note-input');
  const notesList = $('notes-list');
  const searchForm = $('search-form');
  const searchInput = $('search-input');
  const linkBtns = document.querySelectorAll('.link-btn');
  const startPom = $('start-pomodoro');
  const cancelPom = $('cancel-pomodoro');
  const pomMin = $('pomodoro-minutes');
  const pomStatus = $('pomodoro-status');
  const setRemBtn = $('set-reminder-btn');
  const remDateInput = $('reminder-datetime');
  const remTextInput = $('reminder-text');
  const remindersList = $('reminders-list');

  // load saved data
  loadNotes();
  loadReminders();
  renderPomodoroStatus();

  // Notes
  addBtn.addEventListener('click', addNote);
  function addNote(){
    const text = noteInput.value.trim();
    if (!text) return;
    const id = 'note_' + Date.now();
    const note = { id, text, created: Date.now() };
    chrome.storage.local.get({notes: []}, res => {
      const notes = res.notes;
      notes.unshift(note);
      chrome.storage.local.set({notes}, () => {
        noteInput.value = '';
        renderNotes(notes);
      });
    });
  }
  function renderNotes(notes){
    notesList.innerHTML = '';
    notes.forEach(n => {
      const li = document.createElement('li');
      li.className = 'item';
      li.innerHTML = `<div style="flex:1; margin-right:8px;">${escapeHtml(n.text)}</div>
                      <div>
                        <button class="del-note" data-id="${n.id}">Delete</button>
                      </div>`;
      notesList.appendChild(li);
    });
    // attach delete handlers
    notesList.querySelectorAll('.del-note').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        chrome.storage.local.get({notes:[]}, res=>{
          const notes = res.notes.filter(x => x.id !== id);
          chrome.storage.local.set({notes}, () => renderNotes(notes));
        });
      });
    });
  }
  function loadNotes(){ chrome.storage.local.get({notes: []}, res => renderNotes(res.notes)); }

  // Quick Search
  searchForm.addEventListener('submit', e=>{
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    chrome.tabs.create({ url: 'https://www.google.com/search?q=' + encodeURIComponent(q) });
  });
  linkBtns.forEach(b => b.addEventListener('click', e => {
    const url = e.target.dataset.url;
    chrome.tabs.create({url});
  }));

  // Pomodoro (background alarm used so notification works even if popup closed)
  startPom.addEventListener('click', () => {
    const minutes = parseInt(pomMin.value) || 25;
    const id = 'pom_' + Date.now();
    const when = Date.now() + minutes * 60 * 1000;
    chrome.alarms.create(id, { when });
    // store
    chrome.storage.local.get({pomodoros: []}, res => {
      const arr = res.pomodoros;
      arr.unshift({ id, minutes, when });
      chrome.storage.local.set({pomodoros: arr}, () => {
        renderPomodoroStatus();
      });
    });
  });
  cancelPom.addEventListener('click', () => {
    chrome.storage.local.get({pomodoros: []}, res => {
      const arr = res.pomodoros || [];
      if (arr.length === 0) return;
      const first = arr[0];
      chrome.alarms.clear(first.id, () => {
        const newArr = arr.slice(1);
        chrome.storage.local.set({pomodoros: newArr}, () => renderPomodoroStatus());
      });
    });
  });

  function renderPomodoroStatus(){
    chrome.storage.local.get({pomodoros: []}, res => {
      const arr = res.pomodoros || [];
      if (!arr.length) {
        pomStatus.textContent = 'No active pomodoro';
        return;
      }
      const cur = arr[0]; // most recent
      const remaining = Math.max(0, Math.round((cur.when - Date.now())/1000));
      const mm = Math.floor(remaining/60);
      const ss = remaining % 60;
      pomStatus.textContent = `Active: ${cur.minutes} min — ends in ${mm}m ${ss}s`;
      // update countdown every second while popup is open
      setTimeout(renderPomodoroStatus, 1000);
    });
  }

  // Reminders
  setRemBtn.addEventListener('click', () => {
    const dt = remDateInput.value; // string from datetime-local
    const text = remTextInput.value.trim() || 'Reminder';
    if (!dt) return alert('Pick a date & time');
    const when = new Date(dt).getTime();
    if (isNaN(when) || when <= Date.now()) return alert('Pick a future time');
    const id = 'rem_' + Date.now();
    chrome.alarms.create(id, { when });
    chrome.storage.local.get({reminders: []}, res => {
      const arr = res.reminders;
      arr.unshift({ id, when, text });
      chrome.storage.local.set({reminders: arr}, () => {
        remDateInput.value = ''; remTextInput.value = '';
        renderReminders(arr);
      });
    });
  });

  function renderReminders(list){
    remindersList.innerHTML = '';
    (list||[]).forEach(r => {
      const li = document.createElement('li');
      li.className = 'item';
      const time = new Date(r.when).toLocaleString();
      li.innerHTML = `<div style="flex:1; margin-right:8px;"><strong>${escapeHtml(r.text)}</strong><br/><small>${time}</small></div>
                      <div>
                        <button class="del-rem" data-id="${r.id}">Delete</button>
                      </div>`;
      remindersList.appendChild(li);
    });
    remindersList.querySelectorAll('.del-rem').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = e.target.dataset.id;
        chrome.alarms.clear(id, () => {
          chrome.storage.local.get({reminders: []}, res => {
            const arr = res.reminders.filter(x => x.id !== id);
            chrome.storage.local.set({reminders: arr}, () => renderReminders(arr));
          });
        });
      });
    });
  }
  function loadReminders(){ chrome.storage.local.get({reminders: []}, res => renderReminders(res.reminders)); }

  // helper
  function escapeHtml(text){
    return text.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }
}
