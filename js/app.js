// ── Configuración ──────────────────────────────────────────────
const JUGADORES = ['Matías', 'Diego', 'Pablo', 'Ignacio', 'Carlos', 'Norberto', 'Mercedes'];
const STORAGE_KEY = 'pool_suspensiones_v1';

// ── Estado global ──────────────────────────────────────────────
let state = {
  mesActivo: null,
  meses: {},          // { 'YYYY-MM': { apuestas: {}, resultado: null } }
  puntosGlobales: {}, // { jugador: totalPuntos }
  pozos: {}           // { 'YYYY-MM': totalARS }
};

// ── Persistencia (localStorage) ────────────────────────────────

function guardarStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function cargarStorage() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    state = JSON.parse(raw);
  } else {
    // Primera vez: inicializar puntos globales
    JUGADORES.forEach(j => (state.puntosGlobales[j] = 0));
  }
}

// ── Helpers de fechas ──────────────────────────────────────────

function getMesKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function daysInMonth(key) {
  const [year, month] = key.split('-').map(Number);
  // Día 0 del mes siguiente = último día del mes actual
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(key) {
  const [year, month] = key.split('-').map(Number);
  // Obtiene el día de la semana del primer día (0=domingo, 6=sábado)
  const firstDay = new Date(year, month - 1, 1).getDay();
  // Convierte a: 0=lunes, 1=martes, ..., 6=domingo
  return (firstDay + 6) % 7;
}

function mesLabel(key) {
  return new Date(key + '-01').toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  });
}

function fechaLabel(key, day) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short'
  });
}

// ── Calendarios globales ──────────────────────────────────────

let calendarPicker, calendarResult;
let selectedDates = new Set(); // Apuestas
let selectedDatesResult = new Set(); // Resultados

// ── Calendario ─────────────────────────────────────────────────

function initCalendars() {
  // Calendario de apuestas
  calendarPicker = new FullCalendar.Calendar(document.getElementById('cal-picker'), {
    initialDate: getInitialDate(),
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    locale: 'es',
    height: 'auto',
    selectable: true,
    select: (info) => {
      const dateStr = info.startStr;
      if (selectedDates.has(dateStr)) {
        selectedDates.delete(dateStr);
      } else {
        selectedDates.add(dateStr);
      }
      renderCalendarDates('picker');
      updateSelectedCount();
    },
    datesSet: (info) => {
      renderCalendarDates('picker');
    },
    eventClick: (info) => {
      info.jsEvent.preventDefault();
    }
  });
  calendarPicker.render();

  // Calendario de resultados
  calendarResult = new FullCalendar.Calendar(document.getElementById('res-cal-picker'), {
    initialDate: getInitialDate(),
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: ''
    },
    locale: 'es',
    height: 'auto',
    selectable: true,
    select: (info) => {
      const dateStr = info.startStr;
      if (selectedDatesResult.has(dateStr)) {
        selectedDatesResult.delete(dateStr);
      } else {
        selectedDatesResult.add(dateStr);
      }
      renderCalendarDates('result');
      updateResultCount();
    },
    datesSet: (info) => {
      renderCalendarDates('result');
    }
  });
  calendarResult.render();
}

function getInitialDate() {
  const [year, month] = state.mesActivo.split('-').map(Number);
  return new Date(year, month - 1, 1).toISOString().split('T')[0];
}

function renderCalendarDates(type) {
  const calendar = type === 'picker' ? calendarPicker : calendarResult;
  const selectedSet = type === 'picker' ? selectedDates : selectedDatesResult;
  
  // Limpiar eventos previos
  calendar.removeAllEvents();
  
  // Agregar eventos para los días seleccionados
  selectedSet.forEach(dateStr => {
    calendar.addEvent({
      title: '●',
      date: dateStr,
      backgroundColor: '#185fa5',
      borderColor: '#185fa5',
      display: 'background'
    });
  });
}

function updateSelectedCount() {
  document.getElementById('dias-sel-count').textContent = selectedDates.size;
}

function updateResultCount() {
  document.getElementById('res-dias-count').textContent = selectedDatesResult.size;
}

function clearCalendar() {
  selectedDates.clear();
  renderCalendarDates('picker');
  updateSelectedCount();
}

function clearCalendarCompletely() {
  selectedDates.clear();
  selectedDatesResult.clear();
  renderCalendarDates('picker');
  renderCalendarDates('result');
  updateSelectedCount();
  updateResultCount();
}

// ── Inicialización ─────────────────────────────────────────────

function initMonthSelector() {
  const sel = document.getElementById('mes-select');
  const now = new Date();

  for (let i = -1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = getMesKey(d);

    if (!state.meses[key]) {
      state.meses[key] = { apuestas: {}, resultado: null };
    }

    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = mesLabel(key);
    sel.appendChild(opt);
  }

  state.mesActivo = getMesKey(now);
  sel.value = state.mesActivo;
}

function initPlayerSelector() {
  const sel = document.getElementById('player-select');
  JUGADORES.forEach(j => {
    const opt = document.createElement('option');
    opt.value = j;
    opt.textContent = j;
    sel.appendChild(opt);
  });
}

// ── Cambio de mes ──────────────────────────────────────────────

function cambiarMes() {
  state.mesActivo = document.getElementById('mes-select').value;

  if (!state.meses[state.mesActivo]) {
    state.meses[state.mesActivo] = { apuestas: {}, resultado: null };
  }

  // Reinicializar calendarios con el nuevo mes
  if (calendarPicker) calendarPicker.gotoDate(getInitialDate());
  if (calendarResult) calendarResult.gotoDate(getInitialDate());
  
  selectedDates.clear();
  selectedDatesResult.clear();
  updateSelectedCount();
  updateResultCount();

  const player = document.getElementById('player-select').value;
  refreshCalView(player);
  renderPlayersStatus();
  renderApuestas();
  renderRanking();

  document.getElementById('resultado-summary').style.display = 'none';
}

// ── Cambio de jugador ──────────────────────────────────────────

function updatePlayer() {
  const player = document.getElementById('player-select').value;
  document.getElementById('username-display').textContent = player || '—';
  refreshCalView(player);
}

function refreshCalView(player) {
  const mes = state.meses[state.mesActivo];
  const yaApostó = player && mes.apuestas[player];

  document.getElementById('cal-card').style.display = (player && !yaApostó) ? 'block' : 'none';
  document.getElementById('ya-aposto-msg').style.display = yaApostó ? 'block' : 'none';

  if (player && !yaApostó) {
    buildCalendar('cal-grid', new Set(), false, false);
    document.getElementById('dias-sel-count').textContent = '0';
  }
}

// ── Estado de participantes ────────────────────────────────────

function renderPlayersStatus() {
  const mes = state.meses[state.mesActivo] || { apuestas: {} };
  const container = document.getElementById('players-status');
  container.innerHTML = '';

  JUGADORES.forEach(j => {
    const apostó = !!mes.apuestas[j];
    const row = document.createElement('div');
    row.className = 'player-row';
    row.innerHTML = `
      <div class="avatar">${j.slice(0, 2).toUpperCase()}</div>
      <div class="player-name">${j}</div>
      <span class="badge ${apostó ? 'badge-done' : 'badge-pending'}">
        ${apostó ? 'Apostó' : 'Pendiente'}
      </span>
    `;
    container.appendChild(row);
  });
}

// ── Guardar apuesta ────────────────────────────────────────────

function guardarApuesta() {
  const player = document.getElementById('player-select').value;
  if (!player) { alert('Elegí tu nombre'); return; }

  if (selectedDates.size === 0) { alert('Marcá al menos un día en el calendario'); return; }

  // Convertir fechas completas a números de día
  const [year, month] = state.mesActivo.split('-').map(Number);
  const fechas = Array.from(selectedDates).map(dateStr => {
    const date = new Date(dateStr);
    return date.getDate();
  }).sort((a, b) => a - b);

  const monto = parseInt(document.getElementById('monto-input').value) || 500;
  const mes = state.meses[state.mesActivo];

  // Guardar apuesta
  mes.apuestas[player] = { fechas, monto };

  // Sumar al pozo
  if (!state.pozos[state.mesActivo]) state.pozos[state.mesActivo] = 0;
  state.pozos[state.mesActivo] += monto;

  // Persistir
  guardarStorage();

  // Limpiar calendario completamente
  clearCalendarCompletely();
  
  // Resetear selección de jugador para siguiente apuesta
  setTimeout(() => {
    document.getElementById('player-select').value = '';
    refreshCalView('');
    renderPlayersStatus();
    renderApuestas();
    renderRanking();
  }, 300);
}

// ── Ver apuestas ───────────────────────────────────────────────

function todosApostaron() {
  const mes = state.meses[state.mesActivo] || { apuestas: {} };
  return JUGADORES.every(j => !!mes.apuestas[j]);
}

function renderApuestas() {
  const container = document.getElementById('apuestas-content');
  const mes = state.meses[state.mesActivo] || { apuestas: {} };

  if (!todosApostaron()) {
    const faltantes = JUGADORES.filter(j => !mes.apuestas[j]);
    container.innerHTML = `
      <div class="card">
        <div class="locked">
          <div class="locked-icon">🔒</div>
          <p>Las apuestas se revelan cuando todos hayan apostado.</p>
          <p style="margin-top:8px; font-size:12px; color:#b4b2a9;">
            Faltan: ${faltantes.join(', ')}
          </p>
        </div>
      </div>`;
    return;
  }

  let html = `<div class="card">
    <p class="card-title">Apuestas del mes — reveladas</p>`;

  JUGADORES.forEach(j => {
    const apuesta = mes.apuestas[j];
    const fechasStr = apuesta.fechas
      .slice()
      .sort((a, b) => a - b)
      .map(f => fechaLabel(state.mesActivo, f))
      .join(', ');

    html += `
      <div class="player-row">
        <div class="avatar">${j.slice(0, 2).toUpperCase()}</div>
        <div>
          <div class="player-name" style="font-size:14px;">${j}</div>
          <div style="font-size:12px; color:#888780;">
            ${apuesta.fechas.length} días: ${fechasStr}
          </div>
        </div>
        <span style="font-size:13px; color:#888780;">
          $${apuesta.monto.toLocaleString('es-AR')}
        </span>
      </div>`;
  });

  html += `</div>`;
  container.innerHTML = html;
}

// ── Puntuación ─────────────────────────────────────────────────

function calcularPuntos(apuesta, resultado) {
  const setApuesta = new Set(apuesta.fechas);
  const setReal = new Set(resultado.fechas);

  let exactos = 0;
  setReal.forEach(f => { if (setApuesta.has(f)) exactos++; });

  const diffCantidad = Math.abs(setApuesta.size - setReal.size);
  const ptosCantidad = diffCantidad === 0 ? 3 : diffCantidad === 1 ? 1 : 0;

  return {
    total: exactos * 2 + ptosCantidad,
    exactos,
    diffCantidad,
    ptosCantidad
  };
}

// ── Guardar resultado ──────────────────────────────────────────

function guardarResultado() {
  if (selectedDatesResult.size === 0) { alert('Marcá los días reales en el calendario'); return; }

  // Convertir fechas completas a números de día
  const [year, month] = state.mesActivo.split('-').map(Number);
  const fechasReales = Array.from(selectedDatesResult).map(dateStr => {
    const date = new Date(dateStr);
    return date.getDate();
  }).sort((a, b) => a - b);

  const mes = state.meses[state.mesActivo];
  mes.resultado = { fechas: fechasReales };

  // Calcular y acumular puntos
  const scores = {};
  JUGADORES.forEach(j => {
    if (mes.apuestas[j]) {
      scores[j] = calcularPuntos(mes.apuestas[j], mes.resultado);
      state.puntosGlobales[j] = (state.puntosGlobales[j] || 0) + scores[j].total;
    }
  });

  // Persistir
  guardarStorage();

  // Mostrar resultados ordenados
  const sorted = Object.entries(scores).sort((a, b) => b[1].total - a[1].total);
  const fechasStr = fechasReales
    .map(f => fechaLabel(state.mesActivo, f))
    .join(', ');

  let html = `<p style="font-size:12px; color:#a89a8a; margin-bottom:12px;">
    Días reales: ${fechasStr}
  </p>`;

  sorted.forEach(([jugador, sc], i) => {
    html += `
      <div class="ranking-row rank-${i + 1}">
        <div class="rank-num">${i === 0 ? '★' : i + 1}</div>
        <div>
          <span style="font-size:14px; font-weight:500;">${jugador}</span>
          ${i === 0 ? '<span class="badge badge-winner" style="margin-left:8px;">Ganador</span>' : ''}
          <div style="font-size:12px; color:#b4b2a9; margin-top:2px;">
            ${sc.exactos} fechas exactas · cantidad ${sc.diffCantidad === 0 ? 'exacta' : '±' + sc.diffCantidad}
          </div>
        </div>
        <div style="font-size:18px; font-weight:500;">${sc.total} pts</div>
      </div>`;
  });

  document.getElementById('resultado-detalle').innerHTML = html;
  document.getElementById('resultado-summary').style.display = 'block';

  renderRanking();
}

// ── Ranking ────────────────────────────────────────────────────

function renderRanking() {
  // Pozo total
  const pozo = Object.values(state.pozos).reduce((sum, v) => sum + v, 0);
  document.getElementById('pozo-total').textContent = '$' + pozo.toLocaleString('es-AR');
  document.getElementById('mes-label-rank').textContent = mesLabel(state.mesActivo);

  // Líder
  const sorted = Object.entries(state.puntosGlobales).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] > 0) {
    document.getElementById('lider-nombre').textContent = sorted[0][0];
    document.getElementById('lider-pts').textContent = sorted[0][1] + ' pts';
  }

  // Lista
  const list = document.getElementById('ranking-list');
  if (sorted.every(([, p]) => p === 0)) {
    list.innerHTML = '<div class="empty-state">Aún no hay resultados cargados.</div>';
    return;
  }

  list.innerHTML = sorted.map(([jugador, pts], i) => `
    <div class="ranking-row rank-${i + 1}">
      <div class="rank-num">${i === 0 ? '★' : i + 1}</div>
      <div>
        <div style="font-size:14px; font-weight:500;">${jugador}</div>
        <div style="font-size:12px; color:#b4b2a9;">puntos acumulados</div>
      </div>
      <div style="font-size:20px; font-weight:500;">
        ${pts} <span style="font-size:13px; color:#888780;">pts</span>
      </div>
    </div>`).join('');
}

// ── Navegación de tabs ─────────────────────────────────────────

function showTab(tabId, btn) {
  document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

// ── Volver al inicio ──────────────────────────────────────────

function goToHome() {
  const apostarBtn = document.querySelector('.tab');
  if (apostarBtn) {
    showTab('apostar', apostarBtn);
  }
}

// ── Borrar datos (útil para resetear) ─────────────────────────

function resetearDatos() {
  if (!confirm('¿Seguro que querés borrar TODOS los datos? Esto no se puede deshacer.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ── Arranque ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  cargarStorage();
  initMonthSelector();
  initPlayerSelector();
  initCalendars();
  renderPlayersStatus();
  renderApuestas();
  renderRanking();
});
