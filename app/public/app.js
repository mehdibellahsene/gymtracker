var SESSION_NAMES = {
  session1: 'Dos & Biceps',
  session2: 'Pecs & Triceps',
  session3: 'Jambes',
  session4: 'Epaules & Trap'
};

var activeWorkout = null;
var workoutTimerInterval = null;
var timerInterval = null;
var timerRemaining = 0;
var timerTotal = 0;

document.addEventListener('DOMContentLoaded', function() {
  initDate();
  initTabs();
  initAddButtons();
  initHistoryFilters();
  initClearHistory();
  initWorkoutButtons();
  loadActiveWorkout();
  loadAllPastSessions();
  loadHistory();
  updateStats();
});

function initDate() {
  var d = new Date();
  var options = { weekday: 'short', day: 'numeric', month: 'short' };
  document.getElementById('today-date').textContent = d.toLocaleDateString('fr-FR', options);
}

// === TABS ===
function initTabs() {
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.session').forEach(function(s) { s.classList.remove('active'); });
      tab.classList.add('active');
      document.getElementById(tab.dataset.session).classList.add('active');
    });
  });
}

// === WORKOUTS ===
function initWorkoutButtons() {
  document.querySelectorAll('.btn-start-workout').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var zone = btn.closest('.workout-start-zone');
      var sessionId = zone.dataset.session;
      startWorkout(sessionId);
    });
  });

  document.getElementById('btn-finish-workout').addEventListener('click', function() {
    if (activeWorkout) finishWorkout(activeWorkout.id);
  });
}

function startWorkout(sessionId) {
  fetch('/api/workouts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sessionId })
  })
  .then(function(r) { return r.json(); })
  .then(function(workout) {
    activeWorkout = workout;
    showWorkoutBanner();
    updateWorkoutZones();
    clearExerciseSets();
  });
}

function finishWorkout(workoutId) {
  if (!confirm('Terminer cette seance ?')) return;
  fetch('/api/workouts/' + workoutId + '/finish', { method: 'PUT' })
  .then(function(r) { return r.json(); })
  .then(function() {
    activeWorkout = null;
    hideWorkoutBanner();
    updateWorkoutZones();
    loadAllPastSessions();
    loadHistory();
    updateStats();
  });
}

function loadActiveWorkout() {
  fetch('/api/workouts')
  .then(function(r) { return r.json(); })
  .then(function(workouts) {
    var active = workouts.find(function(w) { return w.status === 'active'; });
    if (active) {
      activeWorkout = active;
      showWorkoutBanner();
      updateWorkoutZones();
      loadWorkoutSets(active.id);
    }
  });
}

function showWorkoutBanner() {
  var banner = document.getElementById('workout-banner');
  banner.style.display = 'flex';
  var name = SESSION_NAMES[activeWorkout.sessionId] || activeWorkout.sessionId;
  document.getElementById('workout-banner-name').textContent = name;
  startWorkoutTimer();
}

function hideWorkoutBanner() {
  document.getElementById('workout-banner').style.display = 'none';
  clearInterval(workoutTimerInterval);
}

function startWorkoutTimer() {
  clearInterval(workoutTimerInterval);
  var startTime = new Date(activeWorkout.startTime).getTime();
  function tick() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    var h = Math.floor(elapsed / 3600);
    var m = Math.floor((elapsed % 3600) / 60);
    var s = elapsed % 60;
    var text = '';
    if (h > 0) text = h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    else text = m + ':' + String(s).padStart(2, '0');
    document.getElementById('workout-banner-time').textContent = text;
  }
  tick();
  workoutTimerInterval = setInterval(tick, 1000);
}

function updateWorkoutZones() {
  document.querySelectorAll('.workout-start-zone').forEach(function(zone) {
    var sessionId = zone.dataset.session;
    var btn = zone.querySelector('.btn-start-workout');
    if (activeWorkout && activeWorkout.sessionId === sessionId) {
      zone.classList.add('active');
      btn.style.display = 'none';
    } else if (activeWorkout) {
      btn.style.display = 'block';
      btn.disabled = true;
      btn.textContent = 'Terminez la seance en cours';
      btn.style.opacity = '0.4';
    } else {
      zone.classList.remove('active');
      btn.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Demarrer la seance';
      btn.style.opacity = '1';
    }
  });
}

function loadWorkoutSets(workoutId) {
  fetch('/api/logs?workoutId=' + workoutId)
  .then(function(r) { return r.json(); })
  .then(function(logs) {
    logs.forEach(function(log) {
      var section = document.getElementById(log.sessionId);
      if (!section) return;
      var exercises = section.querySelectorAll('.exercise');
      exercises.forEach(function(ex) {
        if (ex.dataset.exercise === log.exercise) {
          var setsList = ex.querySelector('.sets-list');
          log.sets.forEach(function(s) {
            var setNum = setsList.querySelectorAll('.set-row').length + 1;
            var row = document.createElement('div');
            row.className = 'set-row';
            row.innerHTML =
              '<div class="set-number" style="border-color:#27ae60;color:#2ecc71">' + setNum + '</div>' +
              '<div class="saved-set">' +
                '<span class="set-val">' + s.reps + ' reps</span>' +
                '<span class="set-val">' + s.poids + ' kg</span>' +
              '</div>';
            setsList.appendChild(row);
          });
          ex.classList.add('has-sets');
        }
      });
    });
    updateProgress();
  });
}

function clearExerciseSets() {
  document.querySelectorAll('.sets-list').forEach(function(sl) { sl.innerHTML = ''; });
  document.querySelectorAll('.exercise').forEach(function(ex) { ex.classList.remove('has-sets'); });
  updateProgress();
}

// === PAST SESSIONS PREVIEWS ===
function loadAllPastSessions() {
  fetch('/api/workouts')
  .then(function(r) { return r.json(); })
  .then(function(workouts) {
    ['session1', 'session2', 'session3', 'session4'].forEach(function(sid) {
      var zone = document.querySelector('.workout-start-zone[data-session="' + sid + '"]');
      if (!zone) return;
      var preview = zone.querySelector('.past-sessions-preview');
      var sessionWorkouts = workouts
        .filter(function(w) { return w.sessionId === sid && w.status === 'finished'; })
        .sort(function(a, b) { return b.id.localeCompare(a.id); })
        .slice(0, 3);

      if (!sessionWorkouts.length) {
        preview.innerHTML = '<div style="font-size:0.75em;color:#555;margin-top:6px">Aucune seance precedente</div>';
        return;
      }

      preview.innerHTML = sessionWorkouts.map(function(w) {
        var d = new Date(w.date + 'T00:00:00');
        var dateStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
        var duration = '';
        if (w.endTime) {
          var sec = Math.floor((new Date(w.endTime) - new Date(w.startTime)) / 1000);
          var mins = Math.floor(sec / 60);
          duration = mins + ' min';
        }
        return '<div class="past-session-card" data-workout-id="' + w.id + '">' +
          '<div class="psc-info">' +
            '<div class="psc-date">' + dateStr + '</div>' +
            '<div class="psc-stats">' + duration + '</div>' +
          '</div>' +
          '<span class="psc-status finished">Termine</span>' +
        '</div>';
      }).join('');

      preview.querySelectorAll('.past-session-card').forEach(function(card) {
        card.addEventListener('click', function() {
          showWorkoutDetail(card.dataset.workoutId, preview);
        });
      });
    });

    // Update workout count
    var finishedCount = workouts.filter(function(w) { return w.status === 'finished'; }).length;
    var el = document.getElementById('stat-workouts');
    if (el) el.textContent = finishedCount;
  });
}

function showWorkoutDetail(workoutId, container) {
  fetch('/api/workouts/' + workoutId)
  .then(function(r) { return r.json(); })
  .then(function(data) {
    var d = new Date(data.date + 'T00:00:00');
    var dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

    // Group logs by exercise
    var byExercise = {};
    data.logs.forEach(function(log) {
      if (!byExercise[log.exercise]) byExercise[log.exercise] = [];
      log.sets.forEach(function(s) { byExercise[log.exercise].push(s); });
    });

    var volume = 0;
    var totalSets = 0;
    data.logs.forEach(function(log) {
      log.sets.forEach(function(s) {
        volume += s.reps * s.poids;
        totalSets++;
      });
    });

    var html = '<div class="workout-detail">' +
      '<div class="workout-detail-header">' +
        '<h3>' + escapeHtml(dateStr) + ' - ' + escapeHtml(SESSION_NAMES[data.sessionId] || '') + '</h3>' +
        '<button class="btn-close-detail">Fermer</button>' +
      '</div>' +
      '<div style="font-size:0.78em;color:#888;margin-bottom:10px">' + totalSets + ' series | ' + volume + ' kg volume</div>';

    Object.keys(byExercise).forEach(function(ex) {
      html += '<div class="workout-detail-exercise">' +
        '<strong>' + escapeHtml(ex) + '</strong>' +
        '<div class="workout-detail-sets">' +
        byExercise[ex].map(function(s) {
          return '<span class="wd-set">' + s.reps + 'r x ' + s.poids + 'kg</span>';
        }).join('') +
        '</div></div>';
    });

    html += '</div>';

    // Insert before the past session cards
    var existing = container.querySelector('.workout-detail');
    if (existing) existing.remove();
    container.insertAdjacentHTML('afterbegin', html);

    container.querySelector('.btn-close-detail').addEventListener('click', function() {
      container.querySelector('.workout-detail').remove();
    });
  });
}

// === ADD SET BUTTONS ===
function initAddButtons() {
  document.querySelectorAll('.btn-add').forEach(function(btn) {
    btn.addEventListener('click', function() { addSetRow(btn); });
  });
}

function addSetRow(btn) {
  var exercise = btn.closest('.exercise');
  var sessionEl = exercise.closest('.session');
  var sessionId = sessionEl.id;

  // Must have active workout for this session
  if (!activeWorkout || activeWorkout.sessionId !== sessionId) {
    alert('Demarrez une seance d\'abord !');
    return;
  }

  var setsList = exercise.querySelector('.sets-list');
  var setNum = setsList.querySelectorAll('.set-row').length + 1;

  var row = document.createElement('div');
  row.className = 'set-row';
  row.innerHTML =
    '<div class="set-number">' + setNum + '</div>' +
    '<input type="number" class="input-reps" placeholder="Reps" min="0" inputmode="numeric">' +
    '<input type="number" class="input-poids" placeholder="kg" min="0" step="0.5" inputmode="decimal">' +
    '<button class="btn-save-set" title="Sauvegarder">&#10003;</button>' +
    '<button class="btn-remove-set" title="Supprimer">&#10005;</button>';
  setsList.appendChild(row);

  row.querySelector('.input-reps').focus();

  row.querySelector('.btn-remove-set').addEventListener('click', function() {
    row.remove();
    renumberSets(setsList);
  });

  row.querySelector('.btn-save-set').addEventListener('click', function() {
    saveSet(row, exercise, setNum);
  });

  row.querySelectorAll('input').forEach(function(input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') saveSet(row, exercise, setNum);
    });
  });
}

function saveSet(row, exercise, setNum) {
  var repsInput = row.querySelector('.input-reps');
  var poidsInput = row.querySelector('.input-poids');
  var reps = parseInt(repsInput.value);
  var poids = parseFloat(poidsInput.value) || 0;
  if (isNaN(reps) || reps <= 0) {
    repsInput.style.borderColor = '#e63946';
    return;
  }

  var sessionEl = exercise.closest('.session');
  var sessionId = sessionEl.id;
  var exerciseName = exercise.dataset.exercise;
  var workoutId = activeWorkout ? activeWorkout.id : null;

  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workoutId: workoutId,
      sessionId: sessionId,
      exercise: exerciseName,
      sets: [{ reps: reps, poids: poids }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function() {
    row.innerHTML =
      '<div class="set-number" style="border-color:#27ae60;color:#2ecc71">' + setNum + '</div>' +
      '<div class="saved-set">' +
        '<span class="set-val">' + reps + ' reps</span>' +
        '<span class="set-val">' + poids + ' kg</span>' +
      '</div>';
    exercise.classList.add('has-sets');
    updateProgress();
    updateStats();
    loadHistory();
    showTimer();
  });
}

function renumberSets(setsList) {
  setsList.querySelectorAll('.set-row').forEach(function(row, i) {
    var num = row.querySelector('.set-number');
    if (num) num.textContent = i + 1;
  });
}

// === PROGRESS ===
function updateProgress() {
  ['session1', 'session2', 'session3', 'session4'].forEach(function(sid) {
    var section = document.getElementById(sid);
    if (!section) return;
    var exercises = section.querySelectorAll('.exercise');
    var done = section.querySelectorAll('.exercise.has-sets').length;
    var pct = exercises.length ? Math.round((done / exercises.length) * 100) : 0;
    var el = document.getElementById('progress-' + sid);
    if (el) el.textContent = pct + '%';
  });
}

// === STATS ===
function updateStats() {
  fetch('/api/logs')
  .then(function(r) { return r.json(); })
  .then(function(logs) {
    var today = new Date().toISOString().split('T')[0];
    var todayLogs = logs.filter(function(l) { return l.date === today; });

    var totalSets = todayLogs.reduce(function(sum, l) { return sum + l.sets.length; }, 0);
    var totalVolume = todayLogs.reduce(function(sum, l) {
      return sum + l.sets.reduce(function(s, set) { return s + (set.reps * set.poids); }, 0);
    }, 0);
    var exercises = [];
    todayLogs.forEach(function(l) {
      if (exercises.indexOf(l.exercise) === -1) exercises.push(l.exercise);
    });

    document.getElementById('stat-sets').textContent = totalSets;
    document.getElementById('stat-volume').textContent = totalVolume.toLocaleString('fr-FR');
    document.getElementById('stat-exercises').textContent = exercises.length;
  });
}

// === REST TIMER ===
function showTimer() {
  document.getElementById('rest-timer').style.display = 'block';
}

function setTimer(seconds) {
  clearInterval(timerInterval);
  timerTotal = seconds;
  timerRemaining = seconds;
  updateTimerDisplay();

  var circle = document.getElementById('timer-circle');
  var circumference = 2 * Math.PI * 45;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = 0;

  timerInterval = setInterval(function() {
    timerRemaining--;
    updateTimerDisplay();
    var progress = (timerTotal - timerRemaining) / timerTotal;
    circle.style.strokeDashoffset = circumference * progress;

    if (timerRemaining <= 0) {
      clearInterval(timerInterval);
      circle.style.stroke = '#2ecc71';
      if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
      setTimeout(function() { circle.style.stroke = ''; }, 2000);
    }
  }, 1000);
}

window.setTimer = setTimer;
window.stopTimer = function() {
  clearInterval(timerInterval);
  timerRemaining = 0;
  updateTimerDisplay();
  document.getElementById('rest-timer').style.display = 'none';
};

function updateTimerDisplay() {
  var min = Math.floor(timerRemaining / 60);
  var sec = timerRemaining % 60;
  document.getElementById('timer-text').textContent = min + ':' + String(sec).padStart(2, '0');
}

// === HISTORY ===
function initHistoryFilters() {
  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      loadHistory(btn.dataset.filter);
    });
  });
}

function initClearHistory() {
  document.getElementById('btn-clear-all').addEventListener('click', function() {
    if (!confirm('Effacer tout l\'historique ? (seances + logs)')) return;
    fetch('/api/workouts')
    .then(function(r) { return r.json(); })
    .then(function(workouts) {
      return Promise.all(workouts.map(function(w) {
        return fetch('/api/workouts/' + w.id, { method: 'DELETE' });
      }));
    })
    .then(function() {
      return fetch('/api/logs').then(function(r) { return r.json(); });
    })
    .then(function(logs) {
      return Promise.all(logs.map(function(l) {
        return fetch('/api/logs/' + l.id, { method: 'DELETE' });
      }));
    })
    .then(function() {
      activeWorkout = null;
      hideWorkoutBanner();
      updateWorkoutZones();
      clearExerciseSets();
      loadAllPastSessions();
      loadHistory();
      updateStats();
    });
  });
}

function loadHistory(filter) {
  if (!filter) filter = 'all';

  fetch('/api/workouts')
  .then(function(r) { return r.json(); })
  .then(function(workouts) {
    var container = document.getElementById('history-list');
    var filtered = workouts.filter(function(w) { return w.status === 'finished'; });

    if (filter !== 'all') {
      filtered = filtered.filter(function(w) { return w.sessionId === filter; });
    }

    filtered.sort(function(a, b) { return b.id.localeCompare(a.id); });

    if (!filtered.length) {
      container.innerHTML = '<div class="empty-state">Aucune seance terminee</div>';
      return;
    }

    // Group by date
    var grouped = {};
    filtered.forEach(function(w) {
      if (!grouped[w.date]) grouped[w.date] = [];
      grouped[w.date].push(w);
    });

    var html = '';
    Object.keys(grouped).forEach(function(date) {
      var dateWorkouts = grouped[date];
      var d = new Date(date + 'T00:00:00');
      var label = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      html += '<div class="history-date-group">';
      html += '<div class="history-date">' + label + '</div>';
      dateWorkouts.forEach(function(w) {
        var name = SESSION_NAMES[w.sessionId] || w.sessionId;
        var duration = '';
        if (w.endTime) {
          var sec = Math.floor((new Date(w.endTime) - new Date(w.startTime)) / 1000);
          duration = Math.floor(sec / 60) + ' min';
        }
        html += '<div class="history-entry">' +
          '<div class="info">' +
            '<div class="exercise-name">' + escapeHtml(name) + '</div>' +
            '<div class="sets-summary">' + duration + '</div>' +
          '</div>' +
          '<div style="display:flex;gap:4px">' +
            '<button class="btn-delete btn-view-workout" data-id="' + w.id + '" title="Voir" style="color:var(--blue);border-color:var(--blue)">&#9776;</button>' +
            '<button class="btn-delete" data-id="' + w.id + '" title="Supprimer">&#10005;</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    });

    container.innerHTML = html;

    // View workout detail
    container.querySelectorAll('.btn-view-workout').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        showWorkoutDetail(btn.dataset.id, container);
      });
    });

    // Delete workout
    container.querySelectorAll('.btn-delete:not(.btn-view-workout)').forEach(function(btn) {
      btn.addEventListener('click', function() {
        if (!confirm('Supprimer cette seance ?')) return;
        fetch('/api/workouts/' + btn.dataset.id, { method: 'DELETE' })
        .then(function() {
          loadHistory(filter);
          loadAllPastSessions();
          updateStats();
        });
      });
    });
  });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
