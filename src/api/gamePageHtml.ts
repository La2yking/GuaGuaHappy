export const gamePageHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Scratch Lottery Game</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: radial-gradient(circle at 0% 0%, rgba(37, 99, 235, 0.35), transparent 40%),
          radial-gradient(circle at 100% 0%, rgba(236, 72, 153, 0.25), transparent 45%),
          #0f172a;
        color: #f8fafc;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        background: transparent;
      }

      .app-container {
        width: 100%;
        max-width: 1280px;
        padding: 32px 24px 48px;
        box-sizing: border-box;
      }

      header {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 16px;
        margin-bottom: 24px;
      }

      header h1 {
        font-size: clamp(1.8rem, 3vw, 2.4rem);
        margin: 0;
        font-weight: 700;
        letter-spacing: -0.03em;
      }

      header p {
        margin: 0;
        opacity: 0.8;
      }

      .status-badge {
        padding: 6px 12px;
        border-radius: 999px;
        font-size: 0.85rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(59, 130, 246, 0.2);
        border: 1px solid rgba(96, 165, 250, 0.4);
        color: #bfdbfe;
      }

      .status-badge.active {
        background: rgba(34, 197, 94, 0.16);
        border-color: rgba(74, 222, 128, 0.4);
        color: #bbf7d0;
      }

      .status-badge.won {
        background: rgba(202, 138, 4, 0.2);
        border-color: rgba(253, 224, 71, 0.4);
        color: #fef08a;
      }

      .status-badge.lost,
      .status-badge.terminated {
        background: rgba(239, 68, 68, 0.18);
        border-color: rgba(248, 113, 113, 0.4);
        color: #fecaca;
      }

      main.layout {
        display: grid;
        gap: 24px;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        align-items: start;
      }

      .panel {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 16px;
        padding: 20px;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(18px);
      }

      .panel h2 {
        margin-top: 0;
        margin-bottom: 16px;
        font-size: 1.2rem;
        letter-spacing: 0.02em;
      }

      form {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
      }

      label {
        font-size: 0.9rem;
        opacity: 0.85;
      }

      input[type='text'] {
        flex: 1 1 200px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.6);
        color: inherit;
        font-size: 0.95rem;
      }

      button {
        padding: 10px 16px;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        background: linear-gradient(135deg, #38bdf8, #6366f1);
        color: #0f172a;
        cursor: pointer;
        transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
      }

      button:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 10px 20px rgba(99, 102, 241, 0.35);
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
        transform: none;
        box-shadow: none;
      }

      .secondary-button {
        background: rgba(148, 163, 184, 0.18);
        color: #e2e8f0;
        border: 1px solid rgba(148, 163, 184, 0.3);
      }

      .session-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .stat-card {
        padding: 12px 14px;
        background: rgba(15, 23, 42, 0.55);
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.14);
      }

      .stat-card span {
        display: block;
      }

      .stat-label {
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        opacity: 0.7;
        margin-bottom: 6px;
      }

      .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
      }

      .session-notice {
        margin: 0 0 12px;
        font-size: 0.9rem;
        opacity: 0.85;
      }

      .list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-height: 260px;
        overflow-y: auto;
      }

      .list::-webkit-scrollbar {
        width: 8px;
      }

      .list::-webkit-scrollbar-thumb {
        background: rgba(148, 163, 184, 0.3);
        border-radius: 999px;
      }

      .transaction {
        display: flex;
        flex-direction: column;
        gap: 6px;
        padding: 12px;
        background: rgba(30, 41, 59, 0.6);
        border-radius: 12px;
        border: 1px solid rgba(148, 163, 184, 0.12);
      }

      .transaction-main {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .transaction-type {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.75;
      }

      .transaction-amount {
        font-weight: 600;
      }

      .transaction-amount.positive {
        color: #34d399;
      }

      .transaction-amount.negative {
        color: #f87171;
      }

      .transaction-balance {
        font-size: 0.85rem;
        opacity: 0.7;
      }

      .ticket-history-item {
        padding: 12px;
        border-radius: 12px;
        background: rgba(30, 41, 59, 0.6);
        border: 1px solid rgba(148, 163, 184, 0.12);
        display: grid;
        gap: 6px;
      }

      .ticket-history-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .ticket-history-header span {
        font-size: 0.9rem;
        font-weight: 600;
      }

      .ticket-history-prize {
        font-weight: 600;
      }

      .ticket-history-prize.win {
        color: #facc15;
      }

      .ticket-history-prize.none {
        opacity: 0.65;
      }

      .ticket-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
      }

      .ticket-card {
        display: flex;
        flex-direction: column;
        gap: 10px;
        padding: 18px;
        background: rgba(30, 41, 59, 0.7);
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        box-shadow: inset 0 1px 0 rgba(148, 163, 184, 0.2);
      }

      .ticket-card h3 {
        margin: 0;
        font-size: 1.1rem;
      }

      .ticket-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px 16px;
        font-size: 0.9rem;
        opacity: 0.85;
      }

      .ticket-description {
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .prize-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 0.85rem;
        opacity: 0.8;
      }

      .ticket-card button {
        margin-top: auto;
      }

      .empty-state {
        opacity: 0.7;
        font-style: italic;
      }

      .encounter-panel header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 12px;
      }

      .encounter-title {
        margin: 0;
        font-size: 1.05rem;
      }

      .encounter-category {
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.65;
      }

      .encounter-narrative {
        margin: 12px 0;
        font-size: 0.92rem;
        line-height: 1.5;
        opacity: 0.85;
      }

      .encounter-controls {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
        align-items: center;
      }

      select {
        appearance: none;
        -webkit-appearance: none;
        padding: 10px 12px;
        border-radius: 10px;
        border: 1px solid rgba(148, 163, 184, 0.35);
        background: rgba(15, 23, 42, 0.6);
        color: inherit;
        font-size: 0.95rem;
      }

      #encounter-options {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .encounter-option-card {
        padding: 14px;
        border-radius: 12px;
        background: rgba(30, 41, 59, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.18);
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .encounter-option-card strong {
        font-size: 1rem;
      }

      .encounter-option-card p {
        margin: 0;
        font-size: 0.9rem;
        opacity: 0.8;
      }

      .encounter-option-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      #activity-log {
        max-height: 340px;
        overflow-y: auto;
        display: flex;
        flex-direction: column-reverse;
        gap: 10px;
        padding-right: 4px;
      }

      .log-entry {
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(30, 41, 59, 0.65);
        border: 1px solid rgba(148, 163, 184, 0.15);
        display: flex;
        gap: 12px;
        align-items: baseline;
        font-size: 0.9rem;
      }

      .log-entry .timestamp {
        font-size: 0.78rem;
        opacity: 0.6;
        min-width: 68px;
      }

      .log-entry.info {
        border-color: rgba(96, 165, 250, 0.25);
      }

      .log-entry.success {
        border-color: rgba(74, 222, 128, 0.4);
      }

      .log-entry.warn {
        border-color: rgba(250, 204, 21, 0.4);
      }

      .log-entry.error {
        border-color: rgba(248, 113, 113, 0.4);
      }

      @media (max-width: 720px) {
        .app-container {
          padding: 24px 18px 36px;
        }

        header {
          flex-direction: column;
          align-items: flex-start;
        }

        main.layout {
          grid-template-columns: 1fr;
        }

        form {
          flex-direction: column;
          align-items: stretch;
        }

        input[type='text'],
        button,
        select {
          width: 100%;
        }
      }
    </style>
  </head>
  <body>
    <div class="app-container">
      <header>
        <div>
          <h1>Scratch Lottery Game</h1>
          <p>Interactive demo client for the scratch lottery backend.</p>
        </div>
        <span id="session-status-badge" class="status-badge">No session</span>
      </header>

      <main class="layout">
        <section class="panel" id="session-panel">
          <h2>Session Control</h2>
          <form id="create-session-form">
            <input id="player-id-input" name="playerId" type="text" placeholder="Optional player ID" autocomplete="off" />
            <button type="submit">Create New Session</button>
          </form>
          <form id="load-session-form">
            <input id="load-session-id" name="sessionId" type="text" placeholder="Load existing session ID" />
            <button type="submit" class="secondary-button">Load Session</button>
            <button type="button" id="refresh-session" class="secondary-button">Refresh</button>
          </form>
          <p id="session-notice" class="session-notice">Create or load a session to begin playing.</p>
          <div class="session-stats">
            <div class="stat-card">
              <span class="stat-label">Session ID</span>
              <span class="stat-value" id="session-id">—</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">State</span>
              <span class="stat-value" id="session-state">—</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Balance</span>
              <span class="stat-value" id="session-balance">0.00</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Target</span>
              <span class="stat-value" id="session-target">0.00</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Scratch Count</span>
              <span class="stat-value" id="session-scratch-count">0</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Encounters</span>
              <span class="stat-value" id="session-encounter-count">0</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Free Tickets</span>
              <span class="stat-value" id="session-free-tickets">0</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Started</span>
              <span class="stat-value" id="session-started">—</span>
            </div>
            <div class="stat-card">
              <span class="stat-label">Finished</span>
              <span class="stat-value" id="session-finished">—</span>
            </div>
          </div>
          <h3>Recent Transactions</h3>
          <ul class="list" id="transaction-list">
            <li class="empty-state">No transactions yet.</li>
          </ul>
        </section>

        <section class="panel" id="tickets-panel">
          <h2>Ticket Catalog</h2>
          <div id="ticket-grid" class="ticket-grid">
            <p class="empty-state">Loading ticket catalog…</p>
          </div>
        </section>

        <section class="panel" id="encounter-panel" hidden>
          <header>
            <h2 class="encounter-title" id="encounter-title">Encounter</h2>
            <span class="encounter-category" id="encounter-category"></span>
          </header>
          <p class="encounter-narrative" id="encounter-synopsis"></p>
          <div class="encounter-controls">
            <label for="encounter-ticket-select">Continue with ticket</label>
            <select id="encounter-ticket-select"></select>
          </div>
          <ul id="encounter-options"></ul>
        </section>

        <section class="panel" id="log-panel">
          <h2>Activity Log</h2>
          <div id="activity-log"></div>
        </section>
      </main>
    </div>

    <script type="module">
      const state = {
        sessionId: null,
        sessionState: null,
        pendingEncounter: null,
        pendingEncounterTicketType: null,
        ticketCatalog: [],
      };

      const elements = {
        createSessionForm: document.getElementById('create-session-form'),
        playerIdInput: document.getElementById('player-id-input'),
        loadSessionForm: document.getElementById('load-session-form'),
        loadSessionInput: document.getElementById('load-session-id'),
        refreshButton: document.getElementById('refresh-session'),
        sessionId: document.getElementById('session-id'),
        sessionState: document.getElementById('session-state'),
        sessionBalance: document.getElementById('session-balance'),
        sessionTarget: document.getElementById('session-target'),
        sessionScratchCount: document.getElementById('session-scratch-count'),
        sessionEncounterCount: document.getElementById('session-encounter-count'),
        sessionFreeTickets: document.getElementById('session-free-tickets'),
        sessionStarted: document.getElementById('session-started'),
        sessionFinished: document.getElementById('session-finished'),
        sessionNotice: document.getElementById('session-notice'),
        statusBadge: document.getElementById('session-status-badge'),
        transactionList: document.getElementById('transaction-list'),
        ticketGrid: document.getElementById('ticket-grid'),
        ticketHistory: document.getElementById('ticket-history'),
        encounterPanel: document.getElementById('encounter-panel'),
        encounterTitle: document.getElementById('encounter-title'),
        encounterCategory: document.getElementById('encounter-category'),
        encounterSynopsis: document.getElementById('encounter-synopsis'),
        encounterOptions: document.getElementById('encounter-options'),
        encounterTicketSelect: document.getElementById('encounter-ticket-select'),
        activityLog: document.getElementById('activity-log'),
      };

      const numberFormatter = new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      function formatCurrency(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          return '0.00';
        }
        return numberFormatter.format(value);
      }

      function formatSigned(value) {
        const prefix = value >= 0 ? '+' : '-';
        return prefix + formatCurrency(Math.abs(value));
      }

      function formatPercent(value) {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          return '—';
        }
        const decimals = value > 0.2 ? 1 : 2;
        return (value * 100).toFixed(decimals) + '%';
      }

      function localizeText(value) {
        if (!value) {
          return '';
        }
        if (typeof value === 'string') {
          return value;
        }
        const navigatorLocale = (navigator.language || 'en').toLowerCase();
        const direct = value[navigatorLocale];
        if (direct) {
          return direct;
        }
        const baseLocale = navigatorLocale.split('-')[0];
        if (value[baseLocale]) {
          return value[baseLocale];
        }
        const keys = Object.keys(value);
        return keys.length ? value[keys[0]] : '';
      }

      function renderDate(value) {
        if (!value) {
          return '—';
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
          return value;
        }
        return date.toLocaleString();
      }

      function appendLog(message, variant = 'info') {
        if (!elements.activityLog) {
          return;
        }
        const entry = document.createElement('div');
        entry.className = 'log-entry ' + variant;
        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        const text = document.createElement('span');
        text.textContent = message;
        entry.appendChild(timestamp);
        entry.appendChild(text);
        elements.activityLog.prepend(entry);
        while (elements.activityLog.childElementCount > 50) {
          const last = elements.activityLog.lastElementChild;
          if (last) {
            elements.activityLog.removeChild(last);
          } else {
            break;
          }
        }
      }

      async function sendJson(url, options = {}) {
        const response = await fetch(url, options);
        const text = await response.text();
        let data = {};
        if (text) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.warn('Received non-JSON response', parseError);
          }
        }
        if (!response.ok) {
          const message = data && typeof data.message === 'string' ? data.message : 'Request failed (' + response.status + ')';
          const error = new Error(message);
          error.data = data;
          error.status = response.status;
          throw error;
        }
        return data;
      }

      function updateSessionNotice(message) {
        if (!elements.sessionNotice) {
          return;
        }
        elements.sessionNotice.textContent = message;
        elements.sessionNotice.hidden = !message;
      }

      function resolveTicketName(ticketTypeId) {
        if (!ticketTypeId) {
          return '';
        }
        const ticket = state.ticketCatalog.find((item) => item.id === ticketTypeId);
        if (!ticket) {
          return ticketTypeId;
        }
        return localizeText(ticket.name) || ticketTypeId;
      }

      function updateTicketButtons() {
        const disabled = !state.sessionId || state.sessionState !== 'active' || !!state.pendingEncounter;
        const buttons = document.querySelectorAll('.purchase-button');
        buttons.forEach((button) => {
          button.disabled = disabled;
          if (disabled) {
            button.title = 'Create an active session and resolve any encounters before purchasing.';
          } else {
            button.removeAttribute('title');
          }
        });
        if (elements.statusBadge) {
          const stateName = state.sessionState ? state.sessionState.toUpperCase() : 'NO SESSION';
          elements.statusBadge.textContent = stateName;
          elements.statusBadge.className = 'status-badge ' + (state.sessionState || '');
        }
      }

      function renderTransactions(transactions) {
        const container = elements.transactionList;
        if (!container) {
          return;
        }
        container.innerHTML = '';
        if (!Array.isArray(transactions) || transactions.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'empty-state';
          empty.textContent = 'No transactions yet.';
          container.appendChild(empty);
          return;
        }
        const recent = transactions.slice(-8).reverse();
        recent.forEach((tx) => {
          const item = document.createElement('li');
          item.className = 'transaction';
          const main = document.createElement('div');
          main.className = 'transaction-main';
          const type = document.createElement('span');
          type.className = 'transaction-type';
          type.textContent = tx.type ? String(tx.type).toUpperCase() : 'EVENT';
          const amount = document.createElement('span');
          amount.className = 'transaction-amount';
          amount.textContent = formatSigned(typeof tx.delta === 'number' ? tx.delta : 0);
          if (typeof tx.delta === 'number') {
            amount.classList.add(tx.delta >= 0 ? 'positive' : 'negative');
          }
          main.appendChild(type);
          main.appendChild(amount);
          item.appendChild(main);

          const balance = document.createElement('span');
          balance.className = 'transaction-balance';
          balance.textContent = 'Balance after: ' + formatCurrency(typeof tx.balanceAfter === 'number' ? tx.balanceAfter : 0);
          item.appendChild(balance);

          const time = document.createElement('span');
          time.className = 'transaction-balance';
          time.textContent = renderDate(tx.timestamp);
          item.appendChild(time);

          container.appendChild(item);
        });
      }

      function renderTicketHistory(tickets) {
        let historyContainer = document.getElementById('ticket-history');
        if (!historyContainer) {
          historyContainer = document.createElement('ul');
          historyContainer.id = 'ticket-history';
          historyContainer.className = 'list';
          const sessionPanel = document.getElementById('session-panel');
          if (sessionPanel) {
            const heading = document.createElement('h3');
            heading.textContent = 'Recent Tickets';
            sessionPanel.appendChild(heading);
            sessionPanel.appendChild(historyContainer);
          }
        }
        historyContainer.innerHTML = '';
        if (!Array.isArray(tickets) || tickets.length === 0) {
          const empty = document.createElement('li');
          empty.className = 'empty-state';
          empty.textContent = 'No tickets scratched yet.';
          historyContainer.appendChild(empty);
          return;
        }
        const recentTickets = tickets.slice(-6).reverse();
        recentTickets.forEach((ticket) => {
          const item = document.createElement('li');
          item.className = 'ticket-history-item';
          const header = document.createElement('div');
          header.className = 'ticket-history-header';
          const name = document.createElement('span');
          name.textContent = resolveTicketName(ticket.ticketTypeId);
          const code = document.createElement('span');
          code.textContent = ticket.code || '—';
          header.appendChild(name);
          header.appendChild(code);
          item.appendChild(header);

          const created = document.createElement('span');
          created.className = 'ticket-history-created';
          created.textContent = renderDate(ticket.createdAt);
          item.appendChild(created);

          const prize = document.createElement('span');
          prize.className = 'ticket-history-prize';
          const prizeAmount = typeof ticket.prizeAwarded === 'number' ? ticket.prizeAwarded : 0;
          if (prizeAmount > 0) {
            prize.textContent = 'Prize: ' + formatCurrency(prizeAmount) + (ticket.prizeTierLabel ? ' (' + ticket.prizeTierLabel + ')' : '');
            prize.classList.add('win');
          } else {
            prize.textContent = 'No prize';
            prize.classList.add('none');
          }
          item.appendChild(prize);
          historyContainer.appendChild(item);
        });
      }

      function updateEncounterTicketOptions() {
        const select = elements.encounterTicketSelect;
        if (!select) {
          return;
        }
        select.innerHTML = '';
        if (!state.ticketCatalog.length) {
          const option = document.createElement('option');
          option.value = '';
          option.textContent = 'No tickets available';
          select.appendChild(option);
          select.disabled = true;
          return;
        }
        select.disabled = false;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select ticket type';
        select.appendChild(placeholder);
        state.ticketCatalog.forEach((ticket) => {
          const option = document.createElement('option');
          option.value = ticket.id;
          option.textContent = (localizeText(ticket.name) || ticket.id) + ' • ' + formatCurrency(ticket.faceValue);
          if (state.pendingEncounterTicketType && state.pendingEncounterTicketType === ticket.id) {
            option.selected = true;
          }
          select.appendChild(option);
        });
        if (!select.value && state.ticketCatalog.length) {
          if (state.pendingEncounterTicketType) {
            select.value = state.pendingEncounterTicketType;
          } else {
            select.value = state.ticketCatalog[0].id;
          }
        }
      }

      function setEncounter(encounter) {
        state.pendingEncounter = encounter || null;
        const panel = elements.encounterPanel;
        if (!panel) {
          return;
        }
        if (!encounter) {
          panel.hidden = true;
          elements.encounterOptions.innerHTML = '';
          elements.encounterSynopsis.textContent = '';
          elements.encounterCategory.textContent = '';
          updateEncounterTicketOptions();
          return;
        }
        panel.hidden = false;
        elements.encounterTitle.textContent = encounter.name || 'Encounter';
        elements.encounterCategory.textContent = encounter.category ? String(encounter.category).toUpperCase() : '';
        const narrative = encounter.narrative ? localizeText(encounter.narrative) : '';
        const description = [];
        if (narrative) {
          description.push(narrative);
        }
        if (encounter.triggeredAt) {
          description.push('Triggered: ' + renderDate(encounter.triggeredAt));
        }
        elements.encounterSynopsis.textContent = description.join(' • ');
        elements.encounterOptions.innerHTML = '';
        encounter.options.forEach((option) => {
          const card = document.createElement('li');
          card.className = 'encounter-option-card';
          const label = document.createElement('strong');
          label.textContent = option.label || 'Option';
          card.appendChild(label);
          if (option.riskDescription) {
            const risk = document.createElement('p');
            risk.textContent = option.riskDescription;
            card.appendChild(risk);
          }
          const actions = document.createElement('div');
          actions.className = 'encounter-option-actions';
          const chooseButton = document.createElement('button');
          chooseButton.type = 'button';
          chooseButton.textContent = 'Select option';
          chooseButton.addEventListener('click', () => {
            resolveEncounter(option.id);
          });
          actions.appendChild(chooseButton);
          card.appendChild(actions);
          elements.encounterOptions.appendChild(card);
        });
        updateEncounterTicketOptions();
        updateTicketButtons();
      }

      function setSession(session) {
        if (!session) {
          state.sessionId = null;
          state.sessionState = null;
          updateSessionNotice('Create or load a session to begin playing.');
          updateTicketButtons();
          return;
        }
        state.sessionId = session.id;
        state.sessionState = session.state;
        elements.sessionId.textContent = session.id;
        elements.sessionState.textContent = session.state ? String(session.state).toUpperCase() : '—';
        elements.sessionBalance.textContent = formatCurrency(session.balance);
        elements.sessionTarget.textContent = formatCurrency(session.targetBalance);
        elements.sessionScratchCount.textContent = String(session.scratchCount ?? 0);
        elements.sessionEncounterCount.textContent = String(session.encounterCount ?? 0);
        elements.sessionFreeTickets.textContent = String(session.freeTicketsRemaining ?? 0);
        elements.sessionStarted.textContent = renderDate(session.startedAt);
        elements.sessionFinished.textContent = session.finishedAt ? renderDate(session.finishedAt) : '—';
        renderTransactions(session.transactions || []);
        renderTicketHistory(session.tickets || []);
        setEncounter(session.pendingEncounter);
        if (session.state && session.state !== 'active') {
          updateSessionNotice('Session is ' + session.state + '. Create a new session to continue playing.');
        } else {
          updateSessionNotice('');
        }
        updateTicketButtons();
      }

      async function createSession(playerId) {
        try {
          const payload = playerId ? { playerId } : {};
          const data = await sendJson('/sessions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          state.pendingEncounterTicketType = null;
          setSession(data.session);
          appendLog('Created session ' + data.session.id + '.', 'success');
          elements.createSessionForm.reset();
        } catch (error) {
          appendLog('Failed to create session: ' + error.message, 'error');
        }
      }

      async function loadSession(sessionId) {
        try {
          const data = await sendJson('/sessions/' + encodeURIComponent(sessionId));
          state.pendingEncounterTicketType = null;
          if (!data.session) {
            appendLog('Session not found.', 'error');
            return;
          }
          setSession(data.session);
          appendLog('Loaded session ' + data.session.id + '.', 'info');
        } catch (error) {
          appendLog('Failed to load session: ' + error.message, 'error');
        }
      }

      async function refreshSession() {
        if (!state.sessionId) {
          appendLog('No session to refresh.', 'warn');
          return;
        }
        try {
          const data = await sendJson('/sessions/' + encodeURIComponent(state.sessionId));
          if (data.session) {
            setSession(data.session);
            appendLog('Session refreshed.', 'info');
          } else {
            appendLog('Session not found.', 'error');
          }
        } catch (error) {
          appendLog('Failed to refresh session: ' + error.message, 'error');
        }
      }

      function processPurchaseResponse(data, ticketTypeId) {
        if (!data || !data.status) {
          appendLog('Unexpected response from server.', 'error');
          return;
        }
        if (data.status === 'encounter_required') {
          state.pendingEncounterTicketType = ticketTypeId;
        } else {
          state.pendingEncounterTicketType = null;
        }
        if (data.session) {
          setSession(data.session);
        }
        if (data.status === 'encounter_required') {
          const encounterName = data.encounter ? data.encounter.name : 'Encounter';
          appendLog('Encounter triggered: ' + encounterName + '. Choose an option to continue.', 'warn');
        } else if (data.status === 'completed') {
          const ticketName = resolveTicketName(data.ticket ? data.ticket.ticketTypeId : ticketTypeId);
          let message = 'Scratched ' + ticketName + '.';
          if (data.freeTicketUsed) {
            message += ' Free ticket applied.';
          } else if (typeof data.pricePaid === 'number') {
            message += ' Paid ' + formatCurrency(data.pricePaid) + '.';
          }
          if (data.prize && typeof data.prize.amount === 'number' && data.prize.amount > 0) {
            message += ' Won ' + formatCurrency(data.prize.amount) + (data.prize.label ? ' (' + data.prize.label + ').' : '.');
            appendLog(message, 'success');
          } else {
            message += ' No prize this time.';
            appendLog(message, 'info');
          }
          if (data.encounterResolution && data.encounterResolution.option) {
            appendLog('Encounter resolved with option "' + data.encounterResolution.option.label + '".', 'info');
          }
        } else if (data.status === 'session_closed') {
          appendLog('Session has ended. Reason: ' + (data.reason || 'unknown') + '.', 'warn');
          if (data.encounterResolution && data.encounterResolution.option) {
            appendLog('Encounter resolved with option "' + data.encounterResolution.option.label + '".', 'info');
          }
        }
        updateTicketButtons();
      }

      async function purchaseTicket(ticketTypeId) {
        if (!state.sessionId) {
          appendLog('Create or load a session before purchasing tickets.', 'warn');
          return;
        }
        if (state.pendingEncounter) {
          appendLog('Resolve the active encounter before purchasing another ticket.', 'warn');
          return;
        }
        try {
          const data = await sendJson('/sessions/' + encodeURIComponent(state.sessionId) + '/purchase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticketTypeId,
            }),
          });
          processPurchaseResponse(data, ticketTypeId);
        } catch (error) {
          appendLog('Ticket purchase failed: ' + error.message, 'error');
        }
      }

      async function resolveEncounter(optionId) {
        if (!state.sessionId || !state.pendingEncounter) {
          appendLog('No active encounter to resolve.', 'warn');
          return;
        }
        const select = elements.encounterTicketSelect;
        const ticketTypeId = select ? select.value : '';
        if (!ticketTypeId) {
          appendLog('Select a ticket type to continue the encounter.', 'warn');
          return;
        }
        try {
          const data = await sendJson('/sessions/' + encodeURIComponent(state.sessionId) + '/purchase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ticketTypeId,
              encounterOptionId: optionId,
            }),
          });
          processPurchaseResponse(data, ticketTypeId);
        } catch (error) {
          appendLog('Failed to resolve encounter: ' + error.message, 'error');
        }
      }

      function describeTicket(ticket) {
        const container = document.createElement('article');
        container.className = 'ticket-card';
        const title = document.createElement('h3');
        title.textContent = localizeText(ticket.name) || ticket.id;
        container.appendChild(title);

        const meta = document.createElement('div');
        meta.className = 'ticket-meta';
        const faceValue = document.createElement('span');
        faceValue.textContent = 'Face value: ' + formatCurrency(ticket.faceValue);
        meta.appendChild(faceValue);
        const rtp = document.createElement('span');
        rtp.textContent = 'RTP: ' + formatPercent(ticket.rtpTarget);
        meta.appendChild(rtp);
        const maxPrize = document.createElement('span');
        maxPrize.textContent = 'Max prize: ' + formatCurrency(ticket.maxPrize);
        meta.appendChild(maxPrize);
        container.appendChild(meta);

        if (ticket.description) {
          const description = document.createElement('p');
          description.className = 'ticket-description';
          description.textContent = typeof ticket.description === 'string' ? ticket.description : localizeText(ticket.description);
          container.appendChild(description);
        }

        if (ticket.prizeDistribution && Array.isArray(ticket.prizeDistribution.entries)) {
          const list = document.createElement('ul');
          list.className = 'prize-list';
          ticket.prizeDistribution.entries.slice(0, 3).forEach((entry) => {
            const li = document.createElement('li');
            li.textContent = entry.label + ' — ' + formatCurrency(entry.amount) + ' (' + formatPercent(entry.probability) + ')';
            list.appendChild(li);
          });
          if (ticket.prizeDistribution.entries.length > 3) {
            const li = document.createElement('li');
            li.textContent = '…';
            list.appendChild(li);
          }
          container.appendChild(list);
        }

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'purchase-button';
        button.textContent = 'Scratch Ticket';
        button.addEventListener('click', () => purchaseTicket(ticket.id));
        container.appendChild(button);
        return container;
      }

      function renderTicketCatalog() {
        const container = elements.ticketGrid;
        if (!container) {
          return;
        }
        container.innerHTML = '';
        if (!state.ticketCatalog.length) {
          const empty = document.createElement('p');
          empty.className = 'empty-state';
          empty.textContent = 'No tickets configured.';
          container.appendChild(empty);
          return;
        }
        state.ticketCatalog.forEach((ticket) => {
          container.appendChild(describeTicket(ticket));
        });
        updateTicketButtons();
      }

      async function loadTicketCatalog() {
        try {
          const data = await sendJson('/config/tickets');
          state.ticketCatalog = Array.isArray(data.ticketTypes) ? data.ticketTypes : [];
          renderTicketCatalog();
          updateEncounterTicketOptions();
          appendLog('Ticket catalog loaded.', 'info');
        } catch (error) {
          appendLog('Unable to load ticket catalog: ' + error.message, 'error');
        }
      }

      elements.createSessionForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(elements.createSessionForm);
        const playerId = (formData.get('playerId') || '').toString().trim();
        createSession(playerId);
      });

      elements.loadSessionForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const formData = new FormData(elements.loadSessionForm);
        const sessionId = (formData.get('sessionId') || '').toString().trim();
        if (!sessionId) {
          appendLog('Enter a session ID to load.', 'warn');
          return;
        }
        loadSession(sessionId);
      });

      elements.refreshButton.addEventListener('click', () => {
        refreshSession();
      });

      loadTicketCatalog();
      updateTicketButtons();
    </script>
  </body>
</html>`;
