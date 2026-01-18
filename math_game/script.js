document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    const TOTAL_QUESTIONS = 10;

    // --- State ---
    let questions = [];
    let currentQuestionIndex = 0;
    let score = 0;
    let userAnswers = []; // { question: "5 + 3", userAnswer: 8, correctAnswer: 8, isCorrect: true }

    // --- DOM Elements ---
    const startScreen = document.getElementById('start-screen');
    const gameScreen = document.getElementById('game-screen');
    const resultScreen = document.getElementById('result-screen');

    const startBtn = document.getElementById('start-btn');
    const submitBtn = document.getElementById('submit-btn');
    const restartBtn = document.getElementById('restart-btn');

    const questionText = document.getElementById('question-text');
    const answerInput = document.getElementById('answer-input');
    const scoreDisplay = document.getElementById('score-display');
    const questionCount = document.getElementById('question-count');
    const messageBox = document.getElementById('message-box');

    const feedbackOverlay = document.getElementById('feedback-overlay');
    const feedbackImg = document.getElementById('feedback-img');
    const feedbackText = document.getElementById('feedback-text');
    const correctAnswerDisplay = document.getElementById('correct-answer-display');

    const finalScore = document.getElementById('final-score');
    const reviewList = document.getElementById('review-list');

    // --- Event Listeners ---
    startBtn.addEventListener('click', startGame);
    submitBtn.addEventListener('click', submitAnswer);
    restartBtn.addEventListener('click', resetGame);
    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitAnswer();
    });

    // --- Game Logic ---

    function generateQuestions() {
        const newQuestions = [];
        for (let i = 0; i < TOTAL_QUESTIONS; i++) {
            // Difficulty scaling
            let maxVal;
            if (i < 3) {
                maxVal = 20; // Easy (Q1-3)
            } else if (i < 7) {
                maxVal = 100; // Medium (Q4-7)
            } else {
                maxVal = 1000; // Hard (Q8-10)
            }

            // Randomly decide addition or subtraction (70% addition)
            const isAddition = Math.random() > 0.3;

            let a, b, operator, answer;

            if (isAddition) {
                a = Math.floor(Math.random() * (maxVal - 1)) + 1;
                b = Math.floor(Math.random() * (maxVal - a)) + 1;
                operator = '+';
                answer = a + b;
            } else {
                a = Math.floor(Math.random() * maxVal) + 1;
                b = Math.floor(Math.random() * a);
                operator = '-';
                answer = a - b;
            }

            newQuestions.push({
                a,
                b,
                operator,
                answer
            });
        }
        return newQuestions;
    }

    function startGame() {
        questions = generateQuestions();
        currentQuestionIndex = 0;
        score = 0;
        userAnswers = [];

        startScreen.classList.remove('active');
        resultScreen.classList.remove('active');
        gameScreen.classList.add('active');

        updateUI();
        showQuestion();
    }

    function showQuestion() {
        const q = questions[currentQuestionIndex];
        questionText.textContent = `${q.a} ${q.operator} ${q.b} = ?`;
        answerInput.value = '';

        // Enable inputs
        answerInput.disabled = false;
        submitBtn.disabled = false;

        answerInput.focus();
        messageBox.textContent = getRandomEncouragement();
    }

    function updateUI() {
        scoreDisplay.textContent = `スコア: ${score}`;
        questionCount.textContent = `もんだい: ${currentQuestionIndex + 1}/${TOTAL_QUESTIONS}`;
    }

    function submitAnswer() {
        const inputVal = answerInput.value;
        if (inputVal === '') return; // Don't submit empty

        // Disable inputs to prevent double submission
        answerInput.disabled = true;
        submitBtn.disabled = true;

        const userAnswer = parseInt(inputVal, 10);
        const q = questions[currentQuestionIndex];
        const isCorrect = userAnswer === q.answer;

        // Record result
        userAnswers.push({
            question: `${q.a} ${q.operator} ${q.b}`,
            userAnswer: userAnswer,
            correctAnswer: q.answer,
            isCorrect: isCorrect
        });

        if (isCorrect) {
            score++;
            showFeedback(true);
        } else {
            showFeedback(false, q.answer);
        }
    }

    function showFeedback(isCorrect, correctAnswer = null) {
        feedbackOverlay.classList.remove('hidden');
        const feedbackFallback = document.querySelector('.feedback-fallback');
        const feedbackImg = document.getElementById('feedback-img');

        // Reset display
        feedbackImg.style.display = 'block';
        feedbackFallback.style.display = 'none';

        if (isCorrect) {
            feedbackText.textContent = 'だいせいかい！';
            feedbackText.style.color = '#2EC4B6';
            feedbackImg.src = 'assets/correct_icon.png';
            feedbackFallback.textContent = '🎉';
            correctAnswerDisplay.textContent = '';
            messageBox.textContent = 'やったね！すごい！';
        } else {
            feedbackText.textContent = 'ざんねん...';
            feedbackText.style.color = '#E63946';
            feedbackImg.src = 'assets/incorrect_icon.png';
            feedbackFallback.textContent = '🤔';
            correctAnswerDisplay.textContent = `せいかいは ${correctAnswer} だよ`;
            messageBox.textContent = 'つぎは がんばろう！';
        }

        // Wait then move to next text
        setTimeout(() => {
            feedbackOverlay.classList.add('hidden');
            nextQuestion();
        }, 2000);
    }

    function nextQuestion() {
        currentQuestionIndex++;
        if (currentQuestionIndex < TOTAL_QUESTIONS) {
            updateUI();
            showQuestion();
        } else {
            endGame();
        }
    }

    function endGame() {
        gameScreen.classList.remove('active');
        resultScreen.classList.add('active');

        finalScore.textContent = `${TOTAL_QUESTIONS}もんちゅう ${score}もん せいかい！`;

        // Build review list
        reviewList.innerHTML = '';
        userAnswers.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = `review-item ${item.isCorrect ? 'correct' : 'incorrect'}`;
            const statusIcon = item.isCorrect ? '⭕' : '❌';
            div.innerHTML = `
                <span>${index + 1}. ${item.question} = ${item.correctAnswer}</span>
                <span>(あなた: ${item.userAnswer}) ${statusIcon}</span>
            `;
            reviewList.appendChild(div);
        });
    }

    function resetGame() {
        startGame();
    }

    function getRandomEncouragement() {
        const messages = ['がんばって！', 'きみならできる！', 'おちついて！', 'いいちょうし！'];
        return messages[Math.floor(Math.random() * messages.length)];
    }
});
