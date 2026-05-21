// 1. Registrazione del Service Worker per la PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => {
                console.log('Service Worker registrato con successo!', reg.scope);
                // Mostra un piccolo avviso se l'app è pronta offline
                if (reg.active) {
                    showToast();
                }
            })
            .catch(err => console.error('Errore registrazione Service Worker:', err));
    });
}

// 2. Gestione Timer di Recupero (90 secondi standard)
let timerInterval = null;
let timeLeft = 90;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timerDisplay');
const btnTimerToggle = document.getElementById('btnTimerToggle');
const btnTimerReset = document.getElementById('btnTimerReset');

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function toggleTimer() {
    if (isTimerRunning) {
        // Pausa
        clearInterval(timerInterval);
        btnTimerToggle.textContent = 'Riprendi';
        btnTimerToggle.className = 'btn btn-primary';
        isTimerRunning = false;
    } else {
        // Avvia
        isTimerRunning = true;
        btnTimerToggle.textContent = 'Pausa';
        btnTimerToggle.className = 'btn btn-secondary';
        
        timerInterval = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                updateTimerDisplay();
            } else {
                // Fine tempo
                clearInterval(timerInterval);
                timerDisplay.textContent = "00:00";
                btnTimerToggle.textContent = 'Avvia Recupero';
                btnTimerToggle.className = 'btn btn-primary';
                isTimerRunning = false;
                timeLeft = 90;
                
                // Opzione: Riproduce un suono acustico nativo usando Web Audio API
                suonaFineRecupero();
                alert("Recupero Terminato! Sotto con la prossima serie! 💪");
            }
        }, 1000);
    }
}

function resetTimer() {
    clearInterval(timerInterval);
    timeLeft = 90;
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
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Nota La (A5)
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3); // Suona per 0.3 secondi
    } catch (e) {
        console.log("Audio non supportato o bloccato dalle policy del browser.");
    }
}

btnTimerToggle.addEventListener('click', toggleTimer);
btnTimerReset.addEventListener('click', resetTimer);


// 3. Gestione Dati con LocalStorage (Logica Core PWA Offline)
const workoutForm = document.getElementById('workoutForm');
const workoutList = document.getElementById('workoutList');
const emptyState = document.getElementById('emptyState');
const btnClearHistory = document.getElementById('btnClearHistory');

// Carica lo storico iniziale al caricamento della pagina
document.addEventListener('DOMContentLoaded', mostraStorico);

workoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const esercizio = document.getElementById('exerciseSelect').value;
    const kg = document.getElementById('weightInput').value;
    const reps = document.getElementById('repsInput').value;
    
    salvaSerie(esercizio, kg, reps);
    
    // Reset dei soli campi numerici per velocizzare l'inserimento successivo
    document.getElementById('weightInput').value = '';
    document.getElementById('repsInput').value = '';
    
    // Avvia automaticamente il timer per ottimizzare i tempi in palestra
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
    
    storico.unshift(nuovaSerie); // Mette l'ultimo esercizio in cima
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

// Toast PWA Feedback
function showToast() {
    const toast = document.getElementById('pwaToast');
    toast.classList.remove('hidden');
    document.getElementById('closeToast').addEventListener('click', () => {
        toast.classList.add('hidden');
    });
    // Nascondi automaticamente dopo 4 secondi
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}
