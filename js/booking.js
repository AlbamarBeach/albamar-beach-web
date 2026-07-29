// Tarifas por temporada. Ajusta aquí si cambian los precios o los meses.
const SEASONS = [
  { name: 'Temporada alta', months: [6, 7, 8], price: 135, minNights: 6 },
  { name: 'Temporada media', months: [9, 10], price: 100, minNights: 2 },
  { name: 'Temporada baja', months: [11, 12, 1, 2, 3, 4, 5], price: 90, minNights: 2 },
];

function getSeason(date) {
  const month = date.getMonth() + 1;
  return SEASONS.find(s => s.months.includes(month));
}

document.addEventListener('DOMContentLoaded', async () => {
  const monthLabel = document.getElementById('monthLabel');
  const grid = document.getElementById('calendarGrid');
  const status = document.getElementById('calendarStatus');
  const prevBtn = document.getElementById('prevMonth');
  const nextBtn = document.getElementById('nextMonth');

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const WEEKDAYS = ['L','M','X','J','V','S','D'];

  const today = new Date(); today.setHours(0,0,0,0);
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let blockedDates = new Set();
  let checkin = null;
  let checkout = null;

  status.textContent = 'Cargando disponibilidad...';
  try {
    const result = await window.AlbamarICalSync.getBlockedDates();
    blockedDates = result.blocked;
    if (result.feedsConfigured === 0) {
      status.textContent = 'Calendario de reservas directas. Próximamente sincronizado también con Airbnb y Booking.com.';
    } else if (result.feedsFailed) {
      status.textContent = 'Disponibilidad mostrada con la última información guardada; no se pudo actualizar automáticamente en este momento.';
    } else {
      status.textContent = 'Disponibilidad actualizada con Airbnb, Booking.com y reservas directas.';
    }
  } catch (err) {
    status.textContent = 'No se pudo cargar la disponibilidad automática. Escríbenos para confirmar fechas.';
  }

  function fmt(date) { return date.toISOString().slice(0, 10); }

  function renderCalendar() {
    monthLabel.textContent = `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    grid.innerHTML = '';

    WEEKDAYS.forEach(w => {
      const el = document.createElement('div');
      el.className = 'weekday';
      el.textContent = w;
      grid.appendChild(el);
    });

    const firstDay = new Date(viewYear, viewMonth, 1);
    let leadingEmpty = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < leadingEmpty; i++) {
      const el = document.createElement('div');
      el.className = 'calendar-day empty';
      grid.appendChild(el);
    }

    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const key = fmt(date);
      const el = document.createElement('div');
      el.className = 'calendar-day';

      const isPast = date < today;
      const isBlocked = blockedDates.has(key);

      const numberEl = document.createElement('span');
      numberEl.className = 'day-number';
      numberEl.textContent = d;
      el.appendChild(numberEl);

      if (isPast) {
        el.classList.add('past');
      } else if (isBlocked) {
        el.classList.add('blocked');
      } else {
        const priceEl = document.createElement('span');
        priceEl.className = 'day-price';
        priceEl.textContent = getSeason(date).price + '€';
        el.appendChild(priceEl);
        el.addEventListener('click', () => handleDayClick(date));
      }

      if (checkin && key === fmt(checkin)) el.classList.add('selected');
      if (checkout && key === fmt(checkout)) el.classList.add('selected');
      if (checkin && checkout && date > checkin && date < checkout) el.classList.add('in-range');

      grid.appendChild(el);
    }
  }

  function hasBlockedBetween(start, end) {
    let d = new Date(start);
    d.setDate(d.getDate() + 1);
    while (d < end) {
      if (blockedDates.has(fmt(d))) return true;
      d.setDate(d.getDate() + 1);
    }
    return false;
  }

  function nightsBetween(start, end) {
    return Math.round((end - start) / 86400000);
  }

  function priceForStay(start, end) {
    let total = 0;
    let d = new Date(start);
    while (d < end) {
      total += getSeason(d).price;
      d.setDate(d.getDate() + 1);
    }
    return total;
  }

  function handleDayClick(date) {
    if (!checkin || (checkin && checkout)) {
      checkin = date;
      checkout = null;
    } else if (date > checkin) {
      const requiredNights = getSeason(checkin).minNights;
      const nights = nightsBetween(checkin, date);
      if (hasBlockedBetween(checkin, date)) {
        alert('Hay fechas ocupadas dentro de ese rango. Elige otro intervalo.');
        checkin = date;
        checkout = null;
      } else if (nights < requiredNights) {
        alert(`La estancia mínima en ${getSeason(checkin).name.toLowerCase()} es de ${requiredNights} noches. Elige una fecha de salida más adelante.`);
      } else {
        checkout = date;
      }
    } else {
      checkin = date;
      checkout = null;
    }
    renderCalendar();
    updateSummary();
  }

  function updateSummary() {
    const inEl = document.getElementById('summaryCheckin');
    const outEl = document.getElementById('summaryCheckout');
    const nightsEl = document.getElementById('summaryNights');
    const priceEl = document.getElementById('summaryPrice');
    const minNightsNote = document.getElementById('minNightsNote');
    const opts = { day: '2-digit', month: 'short', year: 'numeric' };

    inEl.textContent = checkin ? checkin.toLocaleDateString('es-ES', opts) : '—';
    outEl.textContent = checkout ? checkout.toLocaleDateString('es-ES', opts) : '—';

    if (checkin && checkout) {
      const nightsCount = nightsBetween(checkin, checkout);
      nightsEl.textContent = nightsCount;

      const parking = document.getElementById('parking').checked;
      const pets = parseInt(document.getElementById('pets').value, 10);
      const stayPrice = priceForStay(checkin, checkout);
      const parkingPrice = parking ? nightsCount * 10 : 0;
      const petsPrice = pets * nightsCount * 10;
      priceEl.textContent = `${stayPrice + parkingPrice + petsPrice} €`;
      minNightsNote.textContent = '';
    } else {
      nightsEl.textContent = '—';
      priceEl.textContent = '—';
      const season = checkin ? getSeason(checkin) : null;
      minNightsNote.textContent = season ? `Estancia mínima en ${season.name.toLowerCase()}: ${season.minNights} noches.` : '';
    }
  }

  prevBtn.addEventListener('click', () => {
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  nextBtn.addEventListener('click', () => {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  function buildMessage() {
    if (!checkin || !checkout) {
      alert('Selecciona primero la fecha de entrada y salida en el calendario.');
      return null;
    }
    const opts = { day: '2-digit', month: 'long', year: 'numeric' };
    const guests = document.getElementById('guests').value;
    const parking = document.getElementById('parking').checked;
    const pets = parseInt(document.getElementById('pets').value, 10);
    const name = document.getElementById('name').value.trim();
    const notes = document.getElementById('notes').value.trim();
    const nightsCount = nightsBetween(checkin, checkout);
    const total = priceForStay(checkin, checkout) + (parking ? nightsCount * 10 : 0) + (pets * nightsCount * 10);

    let msg = `Hola, quisiera reservar el Apartamento Albamar Beach.\n`;
    msg += `Entrada: ${checkin.toLocaleDateString('es-ES', opts)}\n`;
    msg += `Salida: ${checkout.toLocaleDateString('es-ES', opts)}\n`;
    msg += `Noches: ${nightsCount}\n`;
    msg += `Huéspedes: ${guests}\n`;
    msg += `Parking: ${parking ? 'Sí (+10 €/día)' : 'No'}\n`;
    msg += `Mascotas: ${pets > 0 ? pets + ' (+10 €/día c/u)' : 'No'}\n`;
    msg += `Precio estimado: ${total} €\n`;
    if (name) msg += `Nombre: ${name}\n`;
    if (notes) msg += `Comentarios: ${notes}\n`;
    return msg;
  }

  document.getElementById('submitWhatsapp').addEventListener('click', () => {
    const msg = buildMessage();
    if (!msg) return;
    window.open(`https://wa.me/34672504141?text=${encodeURIComponent(msg)}`, '_blank');
  });

  document.getElementById('submitEmail').addEventListener('click', () => {
    const msg = buildMessage();
    if (!msg) return;
    const subject = encodeURIComponent('Solicitud de reserva — Apartamento Albamar Beach');
    window.location.href = `mailto:Albamarcalpe19@gmail.com?subject=${subject}&body=${encodeURIComponent(msg)}`;
  });

  document.getElementById('parking').addEventListener('change', updateSummary);
  document.getElementById('pets').addEventListener('change', updateSummary);

  renderCalendar();
});
