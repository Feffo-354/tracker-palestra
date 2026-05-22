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

// Verifica lo stato iniziale del permesso delle notifiche
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
            // Invia una notifica di test immediata per mostrare il funzionamento
            inviaNotificaNative("FitTrack Pro", "Ottimo! Riceverai un avviso alla fine di ogni recupero.");
        } else {
            showToast("Permesso notifiche negato.");
        }
    });
});

function inviaNotificaNative(titolo, testo) {
    if (Notification.permission === 'granted') {
        // Se siamo all'interno di un Service Worker attivo, è preferibile usarlo per mostrare la notifica
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titolo, {
                    body: testo,
                    icon: 'icon-192.png',
                    vibrate: [200, 100, 200],
                    badge: 'icon-192.png'
                });
            });
        } else {
            // Fallback standard se il service worker non controlla ancora la pagina
            new Notification(titolo, { body: testo, icon: 'icon-192.png' });
        }
    }
}


// 3. Gestione Timer di Recupero Personalizzabile
let timerInterval = null;
let defaultRecoverTime = 90; // Valore predefinito in secondi (1:30)
let timeLeft = defaultRecoverTime;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timerDisplay');
const btnTimerToggle = document.getElementById('btnTimerToggle');
const btnTimerReset = document.getElementById('btnTimerReset');
const customTimerInput = document.getElementById('customTimerInput');
const btnSetCustomTimer = document.getElementById('btnSetCustomTimer');

// Inizializza il timer memorizzato nel localStorage se presente
if (localStorage.getItem('fittrack_custom_time')) {
    defaultRecoverTime = parseInt(localStorage.getItem('fittrack_custom_time'));
    customTimerInput.value = defaultRecoverTime;
    timeLeft = defaultRecoverTime;
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

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
                timerDisplay.textContent = "00:00";
                btnTimerToggle.textContent = 'Avvia Recupero';
                btnTimerToggle.className = 'btn btn-primary';
                isTimerRunning = false;
                timeLeft = defaultRecoverTime;
                
                // Trigger Feedback Sonoro e Notifica Push Browser NATIVA
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
    btnTimerToggle.textContent = 'Avvia Recupero';
    btnTimerToggle.className = 'btn btn-primary';
}

function suonaFineRecupero() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
    } catch (e) {
        console.log("Audio bloccato dal browser");
    }
}

btnTimerToggle.addEventListener('click', toggleTimer);
btnTimerReset.addEventListener('click', resetTimer);


// 4. Gestione Tipi di Esercizi Personalizzati
const exerciseSelect = document.getElementById('exerciseSelect');
const newExerciseInput = document.getElementById('newExerciseInput');
const btnAddExercise = document.getElementById('btnAddExercise');

function caricaEsercizi() {
    // Lista base iniziale se localStorage è vuoto
    let eserciziBase = ["Panca Piana", "Squat", "Trazioni sbarra", "Stacco da terra"];
    let eserciziSalvati = JSON.parse(localStorage.getItem('fittrack_exercises')) || eserciziBase;
    
    // Pulisci select
    exerciseSelect.innerHTML = '';
    
    // Popola select
    eserciziSalvati.forEach(es => {
        const option = document.createElement('option');
        option.value = es;
        option.textContent = es;
        exerciseSelect.appendChild(option);
    });
}

btnAddExercise.addEventListener('click', () => {
    const nuovoEsercizio = newExerciseInput.value.trim();
    if (nuovoEsercizio === '') return;
    
    let eserciziBase = ["Panca Piana", "Squat", "Trazioni sbarra", "Stacco da terra"];
    let eserciziSalvati = JSON.parse(localStorage.getItem('fittrack_exercises')) || eserciziBase;
    
    if (eserciziSalvati.includes(nuovoEsercizio)) {
        alert("Questo esercizio è già presente nella lista!");
        return;
    }
    
    eserciziSalvati.push(nuovoEsercizio);
    localStorage.setItem('fittrack_exercises', JSON.stringify(eserciziSalvati));
    
    caricaEsercizi();
    // Seleziona automaticamente l'esercizio appena creato
    exerciseSelect.value = nuovoEsercizio;
    newExerciseInput.value = '';
    showToast("Nuovo esercizio aggiunto alla lista!");
});

// Carica la lista degli esercizi personalizzati all'inizio
caricaEsercizi();


// 5. Gestione Registrazione Dati (Workout Session)
const workoutForm = document.getElementById('workoutForm');
const workoutList = document.getElementById('workoutList');
const emptyState = document.getElementById('emptyState');
const btnClearHistory = document.getElementById('btnClearHistory');

document.addEventListener('DOMContentLoaded', mostraStorico);

workoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const esercizio = exerciseSelect.value;
    const kg = document.getElementById('weightInput').value;
    const reps = document.getElementById('repsInput').value;
    
    salvaSerie(esercizio, kg, reps);
    
    document.getElementById('weightInput').value = '';
    document.getElementById('repsInput').value = '';
    
    // Avvia automaticamente il timer con il tempo personalizzato impostato dall'utente
    resetTimer();
    toggleTimer();
});

function salvaSerie(esercizio, kg, reps) {
    let storico = JSON.parse(localStorage.getItem('fittrack_workouts')) || [];
    
    const nuovaSerie = {
        id: Date.now(),
        orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        esercizio: esercizio,
        kg: parseFloat(kg),
        reps: parseInt(reps)
    };
    
    storico.unshift(nuovaSerie);
    localStorage.setItem('fittrack_workouts', JSON.stringify(storico));
    mostraStorico();
}

function mostraStorico() {
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

btnClearHistory.addEventListener('click', () => {
    if (confirm("Sei sicuro di voler cancellare tutte le serie di oggi?")) {
        localStorage.removeItem('fittrack_workouts');
        mostraStorico();
    }
});

function showToast(msg = "App pronta per l'uso offline!") {
    const toast = document.getElementById('pwaToast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}
document.getElementById('closeToast').addEventListener('click', () => {
    document.getElementById('pwaToast').add('hidden');
});
