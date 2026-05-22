// 1. Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker V3 Attivo!'))
            .catch(err => console.error('Errore SW:', err));
    });
}

// 2. Elementi DOM del pannello Notifiche e Stati
const togglePushNotif = document.getElementById('togglePushNotif');
const toggleAudioNotif = document.getElementById('toggleAudioNotif');
const notifStatusBadge = document.getElementById('notifStatusBadge');
const btnTestNotif = document.getElementById('btnTestNotif');

// Sincronizzazione iniziale dello stato delle notifiche push
function aggiornaStatoNotificheUI() {
    if (Notification.permission === 'granted') {
        let preferenzaPush = localStorage.getItem('fittrack_push_enabled') !== 'false';
        togglePushNotif.checked = preferenzaPush;
        notifStatusBadge.textContent = preferenzaPush ? "Notifiche Attive 🔔" : "Push Disattivate 🔇";
        notifStatusBadge.className = preferenzaPush ? "badge badge-success" : "badge badge-warn";
    } else {
        togglePushNotif.checked = false;
        notifStatusBadge.textContent = "Permesso Mancante ❌";
        notifStatusBadge.className = "badge badge-warn";
    }
    
    // Recupera preferenza audio
    let preferenzaAudio = localStorage.getItem('fittrack_audio_enabled') !== 'false';
    toggleAudioNotif.checked = preferenzaAudio;
}

// Gestione del cambio stato dello switch Notifiche Push
togglePushNotif.addEventListener('change', () => {
    if (togglePushNotif.checked) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                localStorage.setItem('fittrack_push_enabled', 'true');
                aggiornaStatoNotificheUI();
                showToast("Notifiche push attivate!");
            } else {
                togglePushNotif.checked = false;
                localStorage.setItem('fittrack_push_enabled', 'false');
                aggiornaStatoNotificheUI();
                alert("Per attivare i banner, consenti le notifiche nelle impostazioni del browser.");
            }
        });
    } else {
        localStorage.setItem('fittrack_push_enabled', 'false');
        aggiornaStatoNotificheUI();
        showToast("Notifiche push silenziate.");
    }
});

// Gestione del cambio stato dello switch Audio
toggleAudioNotif.addEventListener('change', () => {
    localStorage.setItem('fittrack_audio_enabled', toggleAudioNotif.checked ? 'true' : 'false');
    showToast(toggleAudioNotif.checked ? "Suono attivato" : "Suono disattivato");
});

// Esegui un test immediato degli avvisi impostati dall'utente
btnTestNotif.addEventListener('click', () => {
    showToast("Test avviato! Avviso tra 2 secondi...");
    setTimeout(() => {
        eseguiAvvisoCompleto("Prova FitTrack 🎯", "Il tuo avviso di test funziona correttamente!");
    }, 2000);
});

function eseguiAvvisoCompleto(titolo, testo) {
    // 1. Controllo ed esecuzione avviso audio (se abilitato)
    if (toggleAudioNotif.checked) {
        suonaFineRecupero();
    }
    
    // 2. Controllo ed esecuzione avviso push nativo (se abilitato ed autorizzato)
    if (togglePushNotif.checked && Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(titolo, {
                    body: testo,
                    icon: 'icon-192.png',
                    vibrate: [300, 100, 300],
                    badge: 'icon-192.png'
                });
            });
        } else {
            new Notification(titolo, { body: testo, icon: 'icon-192.png' });
        }
    } else if (!togglePushNotif.checked && !toggleAudioNotif.checked) {
        // Fallback visivo se tutto è spento
        alert(`${titolo}\n${testo}`);
    }
}


// 3. Gestione Timer di Recupero Personalizzabile (Minuti e Secondi)
let timerInterval = null;
let defaultRecoverTime = 90; // Default 1 min e 30 sec = 90 secondi
let timeLeft = defaultRecoverTime;
let isTimerRunning = false;

const timerDisplay = document.getElementById('timerDisplay');
const btnTimerToggle = document.getElementById('btnTimerToggle');
const btnTimerReset = document.getElementById('btnTimerReset');
const timerMinInput = document.getElementById('timerMinInput');
const timerSecInput = document.getElementById('timerSecInput');
const btnSetCustomTimer = document.getElementById('btnSetCustomTimer');

// Ripristina tempo personalizzato salvato nel localStorage
if (localStorage.getItem('fittrack_custom_time_v3')) {
    defaultRecoverTime = parseInt(localStorage.getItem('fittrack_custom_time_v3'));
    timeLeft = defaultRecoverTime;
    
    const minutesSaved = Math.floor(defaultRecoverTime / 60);
    const secondsSaved = defaultRecoverTime % 60;
    timerMinInput.value = minutesSaved;
    timerSecInput.value = secondsSaved;
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

btnSetCustomTimer.addEventListener('click', () => {
    const minVal = parseInt(timerMinInput.value) || 0;
    const secVal = parseInt(timerSecInput.value) || 0;
    
    const totaleSecondi = (minVal * 60) + secVal;
    
    if (totaleSecondi >= 5) {
        defaultRecoverTime = totaleSecondi;
        localStorage.setItem('fittrack_custom_time_v3', defaultRecoverTime);
        resetTimer();
        showToast(`Recupero aggiornato a ${minVal}m e ${secVal}s!`);
    } else {
        alert("Inserisci un tempo complessivo di almeno 5 secondi.");
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
                
                // Richiamo del sistema di avviso dinamico configurato
                eseguiAvvisoCompleto("Tempo Scaduto! 🔥", "Il tuo recupero è completato. Inizia la prossima serie!");
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
        gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.35);
    } catch (e) {
        console.log("Audio non riproducibile");
    }
}

btnTimerToggle.addEventListener('click', toggleTimer);
btnTimerReset.addEventListener('click', resetTimer);


// 4. Gestione Tipi di Esercizi Personalizzati Con EMOJI
const exerciseSelect = document.getElementById('exerciseSelect');
const newExerciseInput = document.getElementById('newExerciseInput');
const newExerciseEmoji = document.getElementById('newExerciseEmoji');
const btnAddExercise = document.getElementById('btnAddExercise');

function caricaEsercizi() {
    // Array di oggetti per contenere l'accoppiamento esercizio + emoji
    const listaDefault = [
        { nome: "Panca Piana", emoji: "🏋️" },
        { nome: "Squat", emoji: "🦵" },
        { nome: "Trazioni sbarra", emoji: "💪" },
        { nome: "Stacco da terra", emoji: "🔥" }
    ];
    
    let eserciziSalvati = JSON.parse(localStorage.getItem('fittrack_exercises_v3')) || listaDefault;
    
    exerciseSelect.innerHTML = '';
    
    eserciziSalvati.forEach(es => {
        const option = document.createElement('option');
        // Valore completo salvato comprensivo di emoji visiva
        option.value = `${es.emoji} ${es.nome}`;
        option.textContent = `${es.emoji} ${es.nome}`;
        exerciseSelect.appendChild(option);
    });
}

btnAddExercise.addEventListener('click', () => {
    const nomeEx = newExerciseInput.value.trim();
    const emojiEx = newExerciseEmoji.value;
    
    if (nomeEx === '') return;
    
    const listaDefault = [
        { nome: "Panca Piana", emoji: "🏋️" },
        { nome: "Squat", emoji: "🦵" },
        { nome: "Trazioni sbarra", emoji: "💪" },
        { nome: "Stacco da terra", emoji: "🔥" }
    ];
    let eserciziSalvati = JSON.parse(localStorage.getItem('fittrack_exercises_v3')) || listaDefault;
    
    // Controllo duplicati sul solo nome
    const esiste gia = eserciziSalvati.some(e => e.nome.toLowerCase() === nomeEx.toLowerCase());
    if (esiste_gia) {
        alert("Questo esercizio esiste già!");
        return;
    }
    
    eserciziSalvati.push({ nome: nomeEx, emoji: emojiEx });
    localStorage.setItem('fittrack_exercises_v3', JSON.stringify(eserciziSalvati));
    
    caricaEsercizi();
    exerciseSelect.value = `${emojiEx} ${nomeEx}`;
    newExerciseInput.value = '';
    showToast("Nuovo esercizio con emoji aggiunto!");
});


// 5. Salvataggio e Storico Sessioni
const workoutForm = document.getElementById('workoutForm');
const workoutList = document.getElementById('workoutList');
const emptyState = document.getElementById('emptyState');
const btnClearHistory = document.getElementById('btnClearHistory');

workoutForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const esercizioConEmoji = exerciseSelect.value;
    const kg = document.getElementById('weightInput').value;
    const reps = document.getElementById('repsInput').value;
    
    salvaSerie(esercizioConEmoji, kg, reps);
    
    document.getElementById('weightInput').value = '';
    document.getElementById('repsInput').value = '';
    
    // Start timer automatico
    resetTimer();
    toggleTimer();
});

function salvaSerie(esercizio, kg, reps) {
    let storico = JSON.parse(localStorage.getItem('fittrack_workouts_v3')) || [];
    
    const nuovaSerie = {
        id: Date.now(),
        orario: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        esercizio: esercizio,
        kg: parseFloat(kg),
        reps: parseInt(reps)
    };
    
    storico.unshift(nuovaSerie);
    localStorage.setItem('fittrack_workouts_v3', JSON.stringify(storico));
    mostraStorico();
}

function mostraStorico() {
    let storico = JSON.parse(localStorage.getItem('fittrack_workouts_v3')) || [];
    
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
                <div class="ex-meta">Serie registrata alle ore ${serie.orario}</div>
            </div>
            <div class="item-data">${serie.reps} x ${serie.kg} Kg</div>
        `;
        workoutList.appendChild(li);
    });
}

btnClearHistory.addEventListener('click', () => {
    if (confirm("Vuoi azzerare la sessione di oggi?")) {
        localStorage.removeItem('fittrack_workouts_v3');
        mostraStorico();
    }
});

function showToast(msg) {
    const toast = document.getElementById('pwaToast');
    document.getElementById('toastMessage').textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => { toast.classList.add('hidden'); }, 3500);
}

document.getElementById('closeToast').addEventListener('click', () => {
    document.getElementById('pwaToast').classList.add('hidden');
});

// Setup iniziale complessivo
caricaEsercizi();
updateTimerDisplay();
aggiornaStatoNotificheUI();
mostraStorico();
