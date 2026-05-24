// 1. Registrazione del Service Worker per la PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker V2 registrato con successo!'))
            .catch(err => console.error('Errore SW:', err));
    });
}

// 2. Richiesta Permessi per Notifiche Push Native del Browser
const btnRequestNotif = document.getElementById('btnRequestNotif');

if (Notification.permission === 'granted') {
    btnRequestNotif.textContent = '🔔 Notifiche Attive';
    btnRequestNotif.disabled = true;
}

btnRequestNotif.addEventListener('click', () => {
    Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
            btnRequestNotif.textContent = '🔔 Notifiche Attive';
            btnRequestNotif.disabled = true;
            showToast("Notifiche attivate con successo!");
            inviaNotificaNative("FitTrack Pro", "Ottimo! Riceverai un avviso alla fine di ogni recupero.");
        } else {
            showToast("Permesso notifiche negato.");
        }
    });
});

function inviaNotificaNative(titolo, testo) {
    if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            // Utilizzo del Service Worker per inviare la notifica nativa in background/foreground
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titolo, {
                    body: testo,
                    icon: 'icon-192.png',
                    badge: 'icon-192.png',
                    vibrate: [200, 100, 200]
                });
            });
        } else {
            new Notification(titolo, { body: testo, icon: 'icon-192.png' });
        }
    }
}

// 3. Gestione Timer di Recupero Personalizzabile
let timerInterval = null;
let defaultRecoverTime = 90;
let timeLeft = defaultRecoverTime;
let isTimerRunning = false;
let selectedSound = localStorage.getItem('fittrack_sound') || 'default';

const timerDisplay = document.getElementById('timerDisplay');
const btnTimerToggle = document.getElementById('btnTimerToggle');
const btnTimerReset = document.getElementById('btnTimerReset');
const customTimerInput = document.getElementById('customTimerInput');
const btnSetCustomTimer = document.getElementById('btnSetCustomTimer');

const settingsModal = document.getElementById('settingsModal');
const btnOpenSettings = document.getElementById('btnOpenSettings');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const soundSelect = document.getElementById('soundSelect');
const btnTestSound = document.getElementById('btnTestSound');

if (soundSelect) soundSelect.value = selectedSound;

if (localStorage.getItem('fittrack_custom_time')) {
    defaultRecoverTime = parseInt(localStorage.getItem('fittrack_custom_time'));
    if (customTimerInput) customTimerInput.value = defaultRecoverTime;
    timeLeft = defaultRecoverTime;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    if (timerDisplay) {
        timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

if (btnSetCustomTimer) {
    btnSetCustomTimer.addEventListener('click', () => {
        const value = parseInt(customTimerInput.value);
        if (value && value >= 5) {
            defaultRecoverTime = value;
            localStorage.setItem('fittrack_custom_time', defaultRecoverTime);
            resetTimer();
            showToast(`Recupero impostato a ${value} secondi!`);
        } else {
            alert("Inserisci un tempo valido (minimo 5 secondi).");
        }
    });
}

function toggleTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval);
        btnTimerToggle.textContent = 'Riprendi';
        btnTimerToggle.className = 'btn btn-primary';
        isTimerRunning = false;
    } else {
        isTimerRunning = true;
        btnTimerToggle.textContent = 'Pausa';
        btnTimerToggle.className = 'btn btn-secondary';
        
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                if (timerDisplay) timerDisplay.textContent = "00:00";
                btnTimerToggle.textContent = 'Avvia Recupero';
                btnTimerToggle.className = 'btn btn-primary';
                isTimerRunning = false;
                timeLeft = defaultRecoverTime;
                
                suonaFineRecupero();
                inviaNotificaNative("Tempo Scaduto! 🔥", "Il tuo tempo di recupero è finito. Sotto con la prossima serie!");
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = defaultRecoverTime;
    isTimerRunning = false;
    updateTimerDisplay();
    if (btnTimerToggle) {
        btnTimerToggle.textContent = 'Avvia Recupero';
        btnTimerToggle.className = 'btn btn-primary';
    }
}

function suonaFineRecupero() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const playTone = (freq, duration, type = 'sine', startTimeOffset = 0) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + startTimeOffset);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + startTimeOffset);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + startTimeOffset + duration);
            oscillator.start(audioCtx.currentTime + startTimeOffset);
            oscillator.stop(audioCtx.currentTime + startTimeOffset + duration);
        };

        switch (selectedSound) {
            case 'double':
                playTone(880, 0.15, 'sine', 0);
                playTone(880, 0.15, 'sine', 0.25);
                break;
            case 'alarm':
                playTone(600, 0.1, 'square', 0);
                playTone(800, 0.1, 'square', 0.1);
                playTone(600, 0.1, 'square', 0.2);
                playTone(800, 0.1, 'square', 0.3);
                break;
            case 'chime':
                playTone(523.25, 0.4, 'triangle', 0);
                playTone(659.25, 0.5, 'triangle', 0.1);
                break;
            case 'default':
            default:
                playTone(880, 0.4, 'sine', 0);
                break;
        }
    } catch (e) {
        console.log("Audio bloccato dalle policy o non supportato");
    }
}

if (btnOpenSettings) {
    btnOpenSettings.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });
}

if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });
}

if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.add('hidden');
        }
    });
}

if (soundSelect) {
    soundSelect.addEventListener('change', () => {
        selectedSound = soundSelect.value;
        localStorage.setItem('fittrack_sound', selectedSound);
    });
}

if (btnTestSound) {
    btnTestSound.addEventListener('click', () => {
        suonaFineRecupero();
    });
}

if (btnTimerToggle) btnTimerToggle.addEventListener('click', toggleTimer);
if (btnTimerReset) btnTimerReset.addEventListener('click', resetTimer);

// 4. Gestione Dinamica degli Esercizi (Predefiniti + Personalizzati)
const exerciseSelect = document.getElementById('exerciseSelect');
const newExerciseInput = document.getElementById('newExerciseInput');
const btnAddExercise = document.getElementById('btnAddExercise');

let listaEsercizi = JSON.parse(localStorage.getItem('fittrack_exercise_list')) || [
    { name: "Panca Piana", emoji: "🏋️" },
    { name: "Squat", emoji: "🦵" },
    { name: "Trazioni sbarra", emoji: "💪" },
    { name: "Stacco da terra", emoji: "🔥" }
];

function popolaSelectEsercizi() {
    if (!exerciseSelect) return;
    exerciseSelect.innerHTML = '';
    listaEsercizi.forEach(ex => {
        const option = document.createElement('option');
        option.value = ex.name;
        option.textContent = `${ex.emoji} ${ex.name}`;
        exerciseSelect.appendChild(option);
    });
}

if (btnAddExercise) {
    btnAddExercise.addEventListener('click', () => {
        const nomeNuovo = newExerciseInput.value.trim();
        if (nomeNuovo) {
            const esisteGia = listaEsercizi.some(ex => ex.name.toLowerCase() === nomeNuovo.toLowerCase());
            if (!esisteGia) {
                listaEsercizi.push({ name: nomeNuovo, emoji: "💪" });
                localStorage.setItem('fittrack_exercise_list', JSON.stringify(listaEsercizi));
                popolaSelectEsercizi();
                exerciseSelect.value = nomeNuovo;
                newExerciseInput.value = '';
                showToast(`Esercizio "${nomeNuovo}" aggiunto!`);
            } else {
                alert("Questo esercizio esiste già in lista.");
            }
        }
    });
}

// 5. Storico Sessione e Salvataggio Dati Locale
const workoutForm = document.getElementById('workoutForm');
const weightInput = document.getElementById('weightInput');
const repsInput = document.getElementById('repsInput');
const workoutList = document.getElementById('workoutList');
const emptyState = document.getElementById('emptyState');
const btnClearHistory = document.getElementById('btnClearHistory');

if (workoutForm) {
    workoutForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const exScelto = exerciseSelect.value;
        const peso = weightInput.value;
        const ripetizioni = repsInput.value;
        const oraAttuale = new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        
        const nuovaSerie = {
            esercizio: exScelto,
            kg: peso,
            reps: ripetizioni,
            orario: oraAttuale
        };
        
        let storico = JSON.parse(localStorage.getItem('fittrack_workouts')) || [];
        storico.unshift(nuovaSerie);
        localStorage.setItem('fittrack_workouts', JSON.stringify(storico));
        
        weightInput.value = '';
        repsInput.value = '';
        
        mostraStorico();
        resetTimer();
        toggleTimer();
        showToast("Serie salvata! Recupero avviato.");
    });
}

function mostraStorico() {
    if (!workoutList || !emptyState) return;
    let storico = JSON.parse(localStorage.getItem('fittrack_workouts')) || [];
    
    if (storico.length === 0) {
        emptyState.classList.remove('hidden');
        workoutList.innerHTML = '';
        return;
    }
    
    emptyState.classList.add('hidden');
    workoutList.innerHTML = '';
    
    storico.forEach(serie => {
        const li = document.createElement('li');
        li.className = 'workout-item';
        li.innerHTML = `
            <div class="item-info">
                <div class="ex-name">${serie.esercizio}</div>
                <div class="ex-meta">Registrato alle ore ${serie.orario}</div>
            </div>
            <div class="item-data">${serie.reps} x ${serie.kg} Kg</div>
        `;
        workoutList.appendChild(li);
    });
}

if (btnClearHistory) {
    btnClearHistory.addEventListener('click', () => {
        if (confirm("Sei sicuro di voler cancellare tutte le serie di oggi?")) {
            localStorage.removeItem('fittrack_workouts');
            mostraStorico();
        }
    });
}

function showToast(msg = "App pronta per l'uso offline!") {
    const toast = document.getElementById('pwaToast');
    const toastMsg = document.getElementById('toastMessage');
    if (toast && toastMsg) {
        toastMsg.textContent = msg;
        toast.classList.remove('hidden');
        setTimeout(() => {
            toast.classList.add('hidden');
        }, 4000);
    }
}

const closeToast = document.getElementById('closeToast');
if (closeToast) {
    closeToast.addEventListener('click', () => {
        const toast = document.getElementById('pwaToast');
        if (toast) toast.classList.add('hidden');
    });
}

// Inizializzazione al caricamento
document.addEventListener('DOMContentLoaded', () => {
    popolaSelectEsercizi();
    mostraStorico();
    updateTimerDisplay();
});
