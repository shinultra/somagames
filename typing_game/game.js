// Game State
let gameQuestions = [];
let currentQuestionIndex = 0;
let currentSentence = null;
let isGameActive = false;

// Session Stats
let startTime = 0;
let mistakes = 0;
let totalScore = 0;
let timerInterval = null;
let sessionHistory = []; // { text, time, mistakes, score }

// Audio Context
let audioCtx;

// DOM Elements
const sceneImage = document.getElementById('scene-image');
const scenePlaceholder = document.getElementById('scene-placeholder');
const japaneseText = document.getElementById('japanese-text');
const romajiContainer = document.getElementById('romaji-container');
const keyboardEl = document.getElementById('keyboard');
const startOverlay = document.getElementById('start-overlay');
const resultOverlay = document.getElementById('result-overlay');
const startBtn = document.getElementById('start-btn');
const retryBtn = document.getElementById('retry-btn');
const feedbackEl = document.getElementById('feedback');
const questionCountEl = document.getElementById('question-count');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const resultScoreEl = document.getElementById('result-score');
const resultCommentEl = document.getElementById('result-comment');
const resultTableBody = document.querySelector('#result-table tbody');

// ---------------------------------------------------------
// ROMAJI ENGINE
// ---------------------------------------------------------

const KANA_TABLE = {
    'あ': ['A'], 'い': ['I', 'YI'], 'う': ['U', 'WU', 'WHU'], 'え': ['E'], 'お': ['O'],
    'か': ['KA', 'CA'], 'き': ['KI'], 'く': ['KU', 'CU', 'QU'], 'け': ['KE'], 'こ': ['KO', 'CO'],
    'さ': ['SA'], 'し': ['SHI', 'SI', 'CI'], 'す': ['SU'], 'せ': ['SE', 'CE'], 'そ': ['SO'],
    'た': ['TA'], 'ち': ['CHI', 'TI'], 'つ': ['TSU', 'TU'], 'て': ['TE'], 'と': ['TO'],
    'な': ['NA'], 'に': ['NI'], 'ぬ': ['NU'], 'ね': ['NE'], 'の': ['NO'],
    'は': ['HA'], 'ひ': ['HI'], 'ふ': ['FU', 'HU'], 'へ': ['HE'], 'ほ': ['HO'],
    'ま': ['MA'], 'み': ['MI'], 'む': ['MU'], 'め': ['ME'], 'も': ['MO'],
    'や': ['YA'], 'ゆ': ['YU'], 'よ': ['YO'],
    'ら': ['RA'], 'り': ['RI'], 'る': ['RU'], 'れ': ['RE'], 'ろ': ['RO'],
    'わ': ['WA'], 'を': ['WO'], 'ん': ['N', 'NN', "N'"],

    'が': ['GA'], 'ぎ': ['GI'], 'ぐ': ['GU'], 'げ': ['GE'], 'ご': ['GO'],
    'ざ': ['ZA'], 'じ': ['JI', 'ZI'], 'ず': ['ZU'], 'ぜ': ['ZE'], 'ぞ': ['ZO'],
    'だ': ['DA'], 'ぢ': ['JI', 'DI'], 'づ': ['ZU', 'DU'], 'で': ['DE'], 'ど': ['DO'],
    'ば': ['BA'], 'び': ['BI'], 'ぶ': ['BU'], 'べ': ['BE'], 'ぼ': ['BO'],
    'ぱ': ['PA'], 'ぴ': ['PI'], 'ぷ': ['PU'], 'ぺ': ['PE'], 'ぽ': ['PO'],

    'ぁ': ['XA', 'LA'], 'ぃ': ['XI', 'LI'], 'ぅ': ['XU', 'LU'], 'ぇ': ['XE', 'LE'], 'ぉ': ['XO', 'LO'],
    'ゃ': ['XYA', 'LYA'], 'ゅ': ['XYU', 'LYU'], 'ょ': ['XYO', 'LYO'],
    'っ': ['XTU', 'LTU', 'TSU', 'TU'], // Double consonant handled separately
    'ー': ['-']
};

const COMBO_TABLE = {
    'きゃ': ['KYA'], 'きゅ': ['KYU'], 'きょ': ['KYO'],
    'しゃ': ['SYA', 'SHA'], 'しゅ': ['SYU', 'SHU'], 'しょ': ['SYO', 'SHO'],
    'ちゃ': ['TYA', 'CHA'], 'ちゅ': ['TYU', 'CHU'], 'ちょ': ['TYO', 'CHO'],
    'にゃ': ['NYA'], 'にゅ': ['NYU'], 'にょ': ['NYO'],
    'ひゃ': ['HYA'], 'ひゅ': ['HYU'], 'ひょ': ['HYO'],
    'みゃ': ['MYA'], 'みゅ': ['MYU'], 'みょ': ['MYO'],
    'りゃ': ['RYA'], 'りゅ': ['RYU'], 'りょ': ['RYO'],
    'ぎゃ': ['GYA'], 'ぎゅ': ['GYU'], 'ぎょ': ['GYO'],
    'じゃ': ['JYA', 'JA', 'ZYA'], 'じゅ': ['JYU', 'JU', 'ZYU'], 'じょ': ['JYO', 'JO', 'ZYO'],
    'びゃ': ['BYA'], 'びゅ': ['BYU'], 'びょ': ['BYO'],
    'ぴゃ': ['PYA'], 'ぴゅ': ['PYU'], 'ぴょ': ['PYO'],
    'ふぁ': ['FA'], 'ふぃ': ['FI'], 'ふぇ': ['FE'], 'ふぉ': ['FO'],
    'うぃ': ['WI'], 'うぇ': ['WE']
};

class RomajiProcessor {
    constructor(displayString) {
        this.displayString = displayString;
        this.currentIndex = 0; // Index in displayString
        this.inputBuffer = "";
        this.completedRomaji = ""; // What has been typed and accepted
    }

    // Returns object { status: 'OK'|'DONE'|'ERROR', nextOptions: [] }
    input(char) {
        if (this.currentIndex >= this.displayString.length) return { status: 'DONE', nextOptions: [] };

        const tempBuffer = this.inputBuffer + char;
        const possibleRomajis = this.getPossibleRomajis(this.currentIndex);

        // Find if any possible Romaji starts with tempBuffer
        const matches = possibleRomajis.filter(r => r.startsWith(tempBuffer));

        if (matches.length > 0) {
            this.inputBuffer = tempBuffer;
            // Check full match
            const fullMatch = matches.find(r => r === tempBuffer);
            if (fullMatch) {
                // Completed this kana?
                // Wait, need to check if we consumed multiple kana (combos)
                // My getPossibleRomajis logic needs to return { romaji, consumedCount }
                const consumed = this.getConsumedCount(tempBuffer, this.currentIndex);
                this.completedRomaji += tempBuffer;
                this.inputBuffer = "";
                this.currentIndex += consumed;

                if (this.currentIndex >= this.displayString.length) {
                    return { status: 'DONE' };
                }
            }
            return { status: 'OK' };
        } else {
            return { status: 'ERROR' };
        }
    }

    getPossibleRomajis(index) {
        const kana = this.displayString[index];
        const nextKana = this.displayString[index + 1];
        const options = [];

        // 1. Combo check (Current + Next)
        if (nextKana) {
            const comboKey = kana + nextKana;
            if (COMBO_TABLE[comboKey]) {
                options.push(...COMBO_TABLE[comboKey]);
            }
        }

        // 2. Sokuon check (っ)
        if (kana === 'っ' && nextKana) {
            // Get valid romaji for NEXT char to determine first letter
            const nextOptions = this.getStandardRomaji(nextKana);
            // Add double consonant versions: 'K' + 'KA' -> 'KKA'
            // We just need the first letter of next romaji
            const consonants = [...new Set(nextOptions.map(r => r[0]).filter(c => /[BCDFGHJKLMNPQRSTVWZ]/.test(c)))];
            consonants.forEach(c => options.push(c));
        }

        // 3. Single Kana check (Standard)
        const singles = this.getStandardRomaji(kana);

        // 4. Special 'n' check
        // If 'n', and next is 'n', 'y', etc. user might need 'nn'. 
        // But KANA_TABLE['ん'] allows 'N', 'NN'.
        // My logic checks strict prefix. 
        // If user input is "N", matches "N" (complete) AND "NN" (partial).
        // I prefer taking "N" if it is valid. 
        // BUT if next char is vowel/y/n, "N" might be ambiguous?
        // Let's stick to list.

        options.push(...singles);

        return options;
    }

    getStandardRomaji(kana) {
        return KANA_TABLE[kana] || []; // Fallback empty
    }

    getConsumedCount(matchedRomaji, index) {
        // Reverse engineer how many kana were used.
        // Try combo first
        const kana = this.displayString[index];
        const nextKana = this.displayString[index + 1];

        if (nextKana) {
            const comboKey = kana + nextKana;
            if (COMBO_TABLE[comboKey] && COMBO_TABLE[comboKey].includes(matchedRomaji)) return 2;
        }

        // Sokuon
        if (kana === 'っ' && matchedRomaji.length === 1) {
            // It was a consonant double.
            // But wait, the processor just consumed the 't' of 'tt'.
            // The INDEX should increment only by 1 (the 'っ'). 
            // The logic above: input 'T' -> matches 'T'? 
            // Yes, I added 'T' to options for 'っ'.
            return 1;
        }

        return 1;
    }

    // Get display HTML components
    getDisplayState() {
        // 1. Completed part (History)
        // 2. Current Buffer (User typed)
        // 3. Current Prediction (Remaining of best match)
        // 4. Future (Default Hepburn)

        let prediction = "";
        let future = "";

        if (this.currentIndex < this.displayString.length) {
            const options = this.getPossibleRomajis(this.currentIndex);
            // Find best match for buffer
            let match = options.find(r => r.startsWith(this.inputBuffer));
            if (!match && options.length > 0) match = options[0];

            if (match) {
                prediction = match.substring(this.inputBuffer.length);
            }

            // Generate default for rest
            // Very naive generation for display purposes
            future = this.generateDefaultString(this.currentIndex + (this.getConsumedCount(match || "A", this.currentIndex)));
        }

        return {
            completed: this.completedRomaji,
            buffer: this.inputBuffer,
            prediction: prediction,
            future: future,
            nextChar: prediction.length > 0 ? prediction[0] : (future.length > 0 ? future[0] : null)
        };
    }

    generateDefaultString(startIndex) {
        let str = "";
        for (let i = startIndex; i < this.displayString.length; i++) {
            const kana = this.displayString[i];
            const next = this.displayString[i + 1];

            // Simple lookahead for combo default
            if (next && COMBO_TABLE[kana + next]) {
                str += COMBO_TABLE[kana + next][0];
                i++;
                continue;
            }
            if (kana === 'っ' && next) {
                const nextR = (KANA_TABLE[next] || [' '])[0];
                str += nextR[0]; // Double consonant
                continue;
            }

            str += (KANA_TABLE[kana] || ['?'])[0];
        }
        return str;
    }
}


// ---------------------------------------------------------
// GAME LOGIC
// ---------------------------------------------------------

const KEYBOARD_LAYOUT = [
    "QWERTYUIOP",
    "ASDFGHJKL",
    "ZXCVBNM"
];

let processor = null;

// Initialize
function init() {
    renderKeyboard();
    renderHands();
    startBtn.addEventListener('click', startGame);
    retryBtn.addEventListener('click', retryGame);
    document.addEventListener('keydown', handleInput);
}

// Start Game
function startGame() {
    startAudioContext();
    startOverlay.style.display = 'none';
    resultOverlay.style.display = 'none';

    // Reset Game State
    totalScore = 0;
    currentQuestionIndex = 0;
    scoreEl.textContent = "0";
    sessionHistory = [];

    // Select 5 random questions
    gameQuestions = selectRandomQuestions(5);

    isGameActive = true;
    loadQuestion();
    playBGM();
}

function retryGame() {
    startGame();
}

function selectRandomQuestions(count) {
    const shuffled = [...GAME_DATA].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// Load Question
function loadQuestion() {
    if (currentQuestionIndex >= gameQuestions.length) {
        endGame();
        return;
    }

    // Enable input
    isGameActive = true;

    currentSentence = gameQuestions[currentQuestionIndex];

    // Init Processor
    processor = new RomajiProcessor(currentSentence.display);

    // Reset Round State
    mistakes = 0;
    startTime = Date.now();

    // UI Updates
    japaneseText.textContent = currentSentence.display;
    questionCountEl.textContent = `${currentQuestionIndex + 1}/${gameQuestions.length}`;
    updateDisplay();
    updateImage(currentSentence.imageKeyword);

    // Start Timer
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 100);

    // Switch BGM
    playBGM();
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = elapsed;
}

// End Game
function endGame() {
    isGameActive = false;
    clearInterval(timerInterval);

    resultScoreEl.textContent = `${totalScore}点`;

    // Feedback logic (Max score approx 500 for 5 questions)
    if (totalScore >= 450) resultCommentEl.textContent = "すごい！てんさい！";
    else if (totalScore >= 300) resultCommentEl.textContent = "とてもよくできました！";
    else if (totalScore >= 100) resultCommentEl.textContent = "がんばったね！";
    else resultCommentEl.textContent = "おしい！つぎはがんばろう！";

    renderResultTable();
    resultOverlay.style.display = 'flex';
    playSuccessSound();
}

function renderResultTable() {
    resultTableBody.innerHTML = '';
    sessionHistory.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.text}</td>
            <td>${Math.floor(item.time)}s</td>
            <td class="${item.mistakes === 0 ? 'correct' : 'miss'}">${item.mistakes}</td>
            <td>${item.score}</td>
        `;
        resultTableBody.appendChild(row);
    });
}

// Update Image
function updateImage(keyword) {
    const imgPath = `images/scene_${keyword}.png`;
    sceneImage.src = imgPath;
    sceneImage.style.display = 'block';
    sceneImage.onerror = () => {
        sceneImage.style.display = 'none';
        scenePlaceholder.style.display = 'block';
        scenePlaceholder.innerText = getEmojiForKeyword(keyword);
    };
    scenePlaceholder.style.display = 'none';
}

function getEmojiForKeyword(key) {
    return '🖼️';
}

// Render Keyboard
function renderKeyboard() {
    keyboardEl.innerHTML = '';
    KEYBOARD_LAYOUT.forEach(rowStr => {
        const rowDiv = document.createElement('div');
        rowDiv.className = 'row';
        for (let char of rowStr) {
            const keyDiv = document.createElement('div');
            keyDiv.className = 'key';
            keyDiv.textContent = char;
            keyDiv.dataset.key = char;
            rowDiv.appendChild(keyDiv);
        }
        keyboardEl.appendChild(rowDiv);
    });
}

// Input Handler
function handleInput(e) {
    // Prevent browser back navigation
    if (e.key === 'Backspace') {
        e.preventDefault();
    }

    // UI Navigation
    if (e.key === 'Enter') {
        if (startOverlay.style.display !== 'none') {
            startGame();
            return;
        }
        if (resultOverlay.style.display !== 'none') {
            retryGame();
            return;
        }
    }

    if (!isGameActive) return;

    const key = e.key.toUpperCase();
    if (!/^[A-Z\-]$/.test(key)) return;

    const keyEl = document.querySelector(`.key[data-key="${key}"]`);
    if (keyEl) {
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 100);
    }

    const oldIndex = processor.currentIndex;
    const result = processor.input(key);

    if (result.status === 'OK' || result.status === 'DONE') {
        playKeySound();

        // Check for newly completed kana
        if (processor.currentIndex > oldIndex) {
            const completedKana = currentSentence.display.substring(oldIndex, processor.currentIndex);
            voiceManager.speak(completedKana);
        }

        updateDisplay();

        if (result.status === 'DONE') {
            completeQuestion();
        }
    } else {
        // Mistake
        mistakes++;
        playErrorSound();
        const container = document.getElementById('text-display');
        container.classList.add('shake');
        setTimeout(() => container.classList.remove('shake'), 300);

        scoreEl.style.color = 'red';
        setTimeout(() => scoreEl.style.color = '', 200);
    }
}

function completeQuestion() {
    // Disable input to prevent spam
    isGameActive = false;

    clearInterval(timerInterval);
    playSuccessSound();

    const elapsedSec = (Date.now() - startTime) / 1000;
    const timePenalty = Math.floor(elapsedSec * 2);
    const mistakePenalty = mistakes * 10;

    let qScore = 100 - timePenalty - mistakePenalty;
    if (qScore < 0) qScore = 0;

    totalScore += qScore;
    scoreEl.textContent = totalScore;

    // Save history
    sessionHistory.push({
        text: currentSentence.display,
        time: elapsedSec,
        mistakes: mistakes,
        score: qScore
    });

    showFeedback();

    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1200);
}

// Visual Updates
function updateDisplay() {
    if (!processor) return;
    const state = processor.getDisplayState();

    let html = '';
    html += `<span class="char-typed">${state.completed}${state.buffer}</span>`;
    html += `<span class="char-current">${state.prediction}</span>`;
    html += `<span class="char-remaining">${state.future}</span>`;

    romajiContainer.innerHTML = html;

    highlightNextKey(state.nextChar);
}

const FINGER_MAP = {
    // Left Hand
    '1': 'LP', 'Q': 'LP', 'A': 'LP', 'Z': 'LP',
    '2': 'LR', 'W': 'LR', 'S': 'LR', 'X': 'LR',
    '3': 'LM', 'E': 'LM', 'D': 'LM', 'C': 'LM',
    '4': 'LI', 'R': 'LI', 'F': 'LI', 'V': 'LI',
    '5': 'LI', 'T': 'LI', 'G': 'LI', 'B': 'LI',

    // Right Hand
    '6': 'RI', 'Y': 'RI', 'H': 'RI', 'N': 'RI',
    '7': 'RI', 'U': 'RI', 'J': 'RI', 'M': 'RI',
    '8': 'RM', 'I': 'RM', 'K': 'RM', ',': 'RM',
    '9': 'RR', 'O': 'RR', 'L': 'RR', '.': 'RR',
    '0': 'RP', 'P': 'RP', ';': 'RP', '/': 'RP', '-': 'RP'
};

// Initialize
function init() {
    renderKeyboard();
    renderHands();
    startBtn.addEventListener('click', startGame);
    retryBtn.addEventListener('click', retryGame);
    document.addEventListener('keydown', handleInput);
}

function highlightNextKey(char) {
    // Clean up highlighted keys
    document.querySelectorAll('.key.highlight').forEach(el => el.classList.remove('highlight'));
    // Clean up hands
    document.querySelectorAll('.hand-finger.active').forEach(el => el.classList.remove('active'));

    if (char) {
        // Highlight Key
        const keyEl = document.querySelector(`.key[data-key="${char}"]`);
        if (keyEl) keyEl.classList.add('highlight');

        // Highlight Finger
        const fingerCode = FINGER_MAP[char];
        if (fingerCode) {
            // fingerCode e.g. 'LP', 'RI'
            // Map to IDs like 'hand-L-P'
            const handId = `hand-${fingerCode.substring(0, 1)}-${fingerCode.substring(1)}`;
            const fingerEl = document.getElementById(handId);
            if (fingerEl) fingerEl.classList.add('active');
        }
    }
}

function renderHands() {
    document.getElementById('left-hand').innerHTML = createStaticHandSVG('L');
    document.getElementById('right-hand').innerHTML = createStaticHandSVG('R');
}

function createStaticHandSVG(side) {
    // Coords for a generic hand (Palm facing viewer)
    // Left Hand: Thumb Right, Pinky Left.
    // Right Hand: Thumb Left, Pinky Right.

    // Let's define paths for LEFT hand, then mirror for Right.
    // IDs: hand-L-P (Pinky), hand-L-R (Ring), hand-L-M (Middle), hand-L-I (Index), hand-L-T (Thumb)

    // Pinky
    const p_d = "M10,60 L10,35 Q10,30 18,30 Q26,30 26,35 L26,60";
    // Ring
    const r_d = "M28,60 L28,25 Q28,20 36,20 Q44,20 44,25 L44,60";
    // Middle
    const m_d = "M46,60 L46,15 Q46,10 54,10 Q62,10 62,15 L62,60";
    // Index
    const i_d = "M64,60 L64,25 Q64,20 72,20 Q80,20 80,25 L80,60";
    // Thumb
    const t_d = "M82,70 L95,50 Q100,60 90,80 L82,90";

    // Palm Base
    const palm = "M10,60 L26,60 L44,60 L62,60 L80,60 L82,90 Q50,110 10,90 Z";

    // For Right hand, we mirror. 
    // SVG transform scaleX(-1) works if we set viewbox/origin correctly.

    const transform = side === 'R' ? "transform: scaleX(-1); transform-origin: center;" : "";

    // Finger IDs
    const types = [
        { id: 'P', d: p_d },
        { id: 'R', d: r_d },
        { id: 'M', d: m_d },
        { id: 'I', d: i_d },
        { id: 'T', d: t_d } // Not used in mapping but good for visual completeness
    ];

    let svg = `<svg class="hand-svg" viewBox="0 0 110 110" style="${transform}">`;
    svg += `<path d="${palm}" fill="#e0e0e0" stroke="#aaa" stroke-width="2" />`;

    types.forEach(f => {
        svg += `<path id="hand-${side}-${f.id}" d="${f.d}" class="hand-finger" />`;
    });

    svg += `</svg>`;
    return svg;
}

function showFeedback() {
    feedbackEl.style.opacity = '1';
    feedbackEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
    setTimeout(() => {
        feedbackEl.style.opacity = '0';
        feedbackEl.style.transform = 'translate(-50%, -50%) scale(1)';
    }, 800);
}

// ---------------------------------------------------------
// AUDIO ENGINE (MUSIC BOX)
// ---------------------------------------------------------

const NOTES = {
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50
};

// Simple Melodies (Loopable)
// Each note: [NoteName, Duration(1/4 beat), Velocity(0-1)]
// null is rest
const MELODIES = {
    // ENERGETIC (Morning, Play, School) - C Major
    'energetic': [
        ['C5', 1], ['G4', 1], ['E5', 1], ['C5', 1],
        ['A4', 1], ['G4', 2], ['C5', 1],
        ['D5', 1], ['E5', 1], ['F5', 1], ['D5', 1],
        ['G5', 3], [null, 1]
    ],
    // CALM (Home, Eat, Read) - F Major / Gentle
    'calm': [
        ['F4', 2], ['A4', 2],
        ['C5', 2], ['A4', 2],
        ['D5', 2], ['C5', 2],
        ['A4', 3], [null, 1]
    ],
    // SLEEPY (Sleep, Night) - Lullaby style
    'sleepy': [
        ['E4', 2], ['G4', 2], ['B4', 4],
        ['E4', 2], ['G4', 2], ['B4', 4],
        ['A4', 2], ['F#4', 2], ['D4', 4]
    ],
    // SAD (Sorry) - Minor
    'sad': [
        ['A4', 2], ['E4', 2], ['C4', 2], ['A3', 2],
        ['B3', 2], ['D4', 2], ['E4', 4]
    ]
};

const BGM_MAPPING = {
    'morning': 'energetic', 'school': 'energetic', 'playing': 'energetic', 'thankyou': 'energetic',
    'greeting': 'energetic', 'airplane': 'energetic', 'train': 'energetic', 'sea': 'energetic',

    'eating': 'calm', 'home': 'calm', 'reading': 'calm', 'studying': 'calm', 'walking_dog': 'calm',
    'study_japanese': 'calm', 'study_math': 'calm', 'study_kanji': 'calm', 'pencil': 'calm', 'teacher': 'calm',
    'hotspring': 'calm', 'souvenir': 'calm',

    'sleeping': 'sleepy', 'cat_sleeping': 'sleepy',
    'sorry': 'sad'
};

class MusicBox {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.bgmGain = null;
        this.nextNoteTime = 0;
        this.noteIndex = 0;
        this.currentMelody = null;
        this.timerID = null;
        this.tempo = 120; // BPM
    }

    init(ctx) {
        this.ctx = ctx;
        this.bgmGain = ctx.createGain();
        this.bgmGain.gain.value = 0.05; // Lower volume for better voice visibility
        this.bgmGain.connect(ctx.destination);
    }

    play(theme) {
        if (!MELODIES[theme]) return;
        this.currentMelody = MELODIES[theme];
        // Don't reset if same theme? No, reset for sync
        this.noteIndex = 0;
        this.isPlaying = true;

        if (this.ctx && this.ctx.state === 'running') {
            this.nextNoteTime = this.ctx.currentTime + 0.1;
            this.scheduler();
        }
    }

    stop() {
        this.isPlaying = false;
        clearTimeout(this.timerID);
    }

    scheduler() {
        if (!this.isPlaying) return;

        // Schedule notes for next 100ms
        while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
            this.playNote(this.currentMelody[this.noteIndex], this.nextNoteTime);
            this.moveNext();
        }

        this.timerID = setTimeout(() => this.scheduler(), 25);
    }

    moveNext() {
        const noteData = this.currentMelody[this.noteIndex];
        const beatLen = noteData ? noteData[1] : 1;
        const secondsPerBeat = 60.0 / this.tempo;

        this.nextNoteTime += beatLen * (secondsPerBeat / 2); // Base unit is 8th note

        this.noteIndex++;
        if (this.noteIndex >= this.currentMelody.length) {
            this.noteIndex = 0; // Loop
        }
    }

    playNote(noteData, time) {
        if (!noteData || !noteData[0]) return; // Rest

        const noteName = noteData[0];
        const freq = NOTES[noteName];
        if (!freq) return;

        // Music Box Sound: Sine + Triangle, percussive envelope
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc2.type = 'triangle';

        osc.frequency.value = freq;
        osc2.frequency.value = freq * 2; // Overtone

        // Mix oscillators
        const merger = this.ctx.createChannelMerger(2);
        osc.connect(gain);
        osc2.connect(gain); // Actually, simple connect is fine if both go to gain

        // Envelope
        // Attack: Very fast
        // Decay: Long
        gain.connect(this.bgmGain);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.3, time + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 1.5); // Long ring

        osc.start(time);
        osc2.start(time);

        osc.stop(time + 2.0);
        osc2.stop(time + 2.0);
    }
}

const musicBox = new MusicBox();

function startAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        musicBox.init(audioCtx);
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playKeySound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
}

function playSuccessSound() {
    if (!audioCtx) return;
    // ... same ...
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(880, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playErrorSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

function playBGM() {
    if (isGameActive && currentSentence) {
        let theme = BGM_MAPPING[currentSentence.imageKeyword] || 'calm';
        musicBox.play(theme);
    } else {
        musicBox.stop();
    }
}


// ---------------------------------------------------------
// VOICE ENGINE (TTS)
// ---------------------------------------------------------
class VoiceManager {
    constructor() {
        this.voice = null;
        this.pitch = 1.1; // Slightly higher than normal, but not too high to avoid artifacts
        this.rate = 1.0;

        this.buffer = "";
        this.timer = null;

        if (window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = () => this.loadVoice();
            this.loadVoice();
        }
    }

    loadVoice() {
        const voices = window.speechSynthesis.getVoices();
        // Try to find a Japanese voice
        // Prefer Google 日本語 or similar if available, else first 'ja'
        this.voice = voices.find(v => v.lang === 'ja-JP' && v.name.includes('Google')) ||
            voices.find(v => v.lang === 'ja-JP') ||
            voices.find(v => v.lang.startsWith('ja'));
    }

    speak(text) {
        if (!this.voice || !window.speechSynthesis) return;

        // Add to buffer
        this.buffer += text;

        // Debounce: Wait for a pause in typing to speak smoothly
        if (this.timer) clearTimeout(this.timer);

        this.timer = setTimeout(() => {
            this.flush();
        }, 1000); // 1000ms wait window for smoother sentences
    }

    flush() {
        if (!this.buffer) return;

        const u = new SpeechSynthesisUtterance(this.buffer);
        u.voice = this.voice;
        u.lang = 'ja-JP';
        u.pitch = this.pitch;
        u.rate = this.rate;
        window.speechSynthesis.speak(u);

        this.buffer = "";
        this.timer = null;
    }
}

const voiceManager = new VoiceManager();

init();
