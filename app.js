// ---- Configuration ----
// Paste your deployed Apps Script Web App URL here (it ends in /exec).
// See the setup instructions for how to get this.
const API_URL = 'https://script.google.com/macros/s/AKfycbz1MEV5NSnteanKVFwL93v1-VxU7lShyhhj-h2_8eitbIR1gnrhJobEmLv43d3gHWv1/exec';

let leagueData = null;

async function loadData() {
  const status = document.getElementById('status');
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    leagueData = await res.json();
    status.remove();
    renderView('allTime');
  } catch (err) {
    status.textContent = 'Could not load league data (' + err.message + '). ' +
      'Check that API_URL in app.js is set to your deployed Apps Script Web App URL.';
    status.classList.add('error');
  }
}

function renderView(view) {
  document.querySelectorAll('.nav-btn').forEach(function (btn) {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  const app = document.getElementById('app');
  app.innerHTML = '';

  if (view === 'allTime') renderAllTime(app);
  else if (view === 'standings') renderStandings(app);
  else if (view === 'headToHead') renderHeadToHead(app);
  else if (view === 'draft') renderDraft(app);
  else if (view === 'champions') renderChampions(app);
}

// ---- Small render helpers ----

function table(headers, rows) {
  const wrap = document.createElement('div');
  wrap.className = 'table-wrap';

  const t = document.createElement('table');
  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  headers.forEach(function (h) {
    const th = document.createElement('th');
    th.textContent = h;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  t.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(function (row) {
    const tr = document.createElement('tr');
    row.forEach(function (cell) {
      const td = document.createElement('td');
      td.textContent = cell != null ? cell : '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  t.appendChild(tbody);

  wrap.appendChild(t);
  return wrap;
}

function rowsFor(data, headers) {
  return data.map(function (r) { return headers.map(function (h) { return r[h]; }); });
}

function heading(text) {
  const h2 = document.createElement('h2');
  h2.textContent = text;
  return h2;
}

function emptyMessage(text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  return p;
}

// ---- Views ----

function renderAllTime(app) {
  app.appendChild(heading('All-Time Records'));
  const data = leagueData.allTime;
  if (!data.length) {
    app.appendChild(emptyMessage('No all-time data yet — run "Build all-time records" in the Sheet.'));
    return;
  }
  const headers = ['Owner', 'Seasons', 'Wins', 'Losses', 'Ties', 'Win %', 'PF', 'PA', 'Championships', 'Playoff Appearances'];
  const sorted = data.slice().sort(function (a, b) { return (b['Win %'] || 0) - (a['Win %'] || 0); });
  app.appendChild(table(headers, rowsFor(sorted, headers)));
}

function renderStandings(app) {
  app.appendChild(heading('Standings by Season'));
  const data = leagueData.standings;
  if (!data.length) {
    app.appendChild(emptyMessage('No standings data yet — run the import in the Sheet.'));
    return;
  }

  const years = Array.from(new Set(data.map(function (r) { return r['Year']; })))
    .sort(function (a, b) { return b - a; });

  const select = document.createElement('select');
  years.forEach(function (y) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  });
  app.appendChild(select);

  const container = document.createElement('div');
  app.appendChild(container);

  const headers = ['Final Rank', 'Team', 'Owner(s)', 'Wins', 'Losses', 'Ties', 'PF', 'PA', 'Made Playoffs', 'Champion'];

  function renderYear(year) {
    container.innerHTML = '';
    const rows = data
      .filter(function (r) { return String(r['Year']) === String(year); })
      .sort(function (a, b) { return (a['Final Rank'] || 99) - (b['Final Rank'] || 99); });
    container.appendChild(table(headers, rowsFor(rows, headers)));
  }

  select.addEventListener('change', function () { renderYear(select.value); });
  renderYear(years[0]);
}

function renderHeadToHead(app) {
  app.appendChild(heading('Head-to-Head'));
  const data = leagueData.headToHead;
  if (!data.length) {
    app.appendChild(emptyMessage('No head-to-head data yet — run "Build head-to-head stats" in the Sheet.'));
    return;
  }

  const owners = Array.from(new Set(data.map(function (r) { return r['Owner']; }))).sort();

  const select = document.createElement('select');
  owners.forEach(function (o) {
    const opt = document.createElement('option');
    opt.value = o;
    opt.textContent = o;
    select.appendChild(opt);
  });
  app.appendChild(select);

  const container = document.createElement('div');
  app.appendChild(container);

  const headers = ['Opponent', 'Wins', 'Losses', 'Ties', 'Meetings', 'PF', 'PA', 'Avg Margin'];

  function renderOwner(owner) {
    container.innerHTML = '';
    const rows = data
      .filter(function (r) { return r['Owner'] === owner; })
      .sort(function (a, b) { return (b['Meetings'] || 0) - (a['Meetings'] || 0); });
    container.appendChild(table(headers, rowsFor(rows, headers)));
  }

  select.addEventListener('change', function () { renderOwner(select.value); });
  renderOwner(owners[0]);
}

function renderDraft(app) {
  app.appendChild(heading('Draft Position by Owner'));
  const posData = leagueData.draftPosition;
  if (!posData.length) {
    app.appendChild(emptyMessage('No draft position data yet — run "Build draft position stats" in the Sheet.'));
  } else {
    const headers = ['Owner', 'Drafts', 'Avg Position', 'Best (Earliest) Position', 'Best Year', 'Worst (Latest) Position', 'Worst Year'];
    const sorted = posData.slice().sort(function (a, b) { return (a['Avg Position'] || 0) - (b['Avg Position'] || 0); });
    app.appendChild(table(headers, rowsFor(sorted, headers)));
  }

  app.appendChild(heading('Championships by Draft Slot'));
  const slotData = leagueData.championsBySlot;
  if (!slotData.length) {
    app.appendChild(emptyMessage('No draft-slot data yet — run "Build champions by draft slot" in the Sheet.'));
  } else {
    const headers = ['Draft Slot', 'Times Drafted From', 'Championships', 'Champion Rate'];
    app.appendChild(table(headers, rowsFor(slotData, headers)));
  }
}

function renderChampions(app) {
  app.appendChild(heading('Champions by Year'));
  const standings = leagueData.standings;
  const champs = standings
    .filter(function (r) { return r['Champion'] === 'Yes'; })
    .sort(function (a, b) { return b['Year'] - a['Year']; });
  if (!champs.length) {
    app.appendChild(emptyMessage('No completed championships yet.'));
  } else {
    const headers = ['Year', 'Team', 'Owner(s)', 'Wins', 'Losses', 'Ties'];
    app.appendChild(table(headers, rowsFor(champs, headers)));
  }

  app.appendChild(heading('Most Championship Team Appearances (Players)'));
  const topPlayers = leagueData.topChampionshipPlayers;
  if (!topPlayers.length) {
    app.appendChild(emptyMessage('No player data yet — run "Build top championship players" in the Sheet.'));
  } else {
    const headers = ['Player', 'Championship Teams', 'Years'];
    app.appendChild(table(headers, rowsFor(topPlayers.slice(0, 25), headers)));
  }
}

// ---- Wire up nav and go ----

document.querySelectorAll('.nav-btn').forEach(function (btn) {
  btn.addEventListener('click', function () { renderView(btn.dataset.view); });
});

loadData();