let questions = [];
let currentQuestion = 0;
let userAnswers = {};
let examFinished = false;
let examMode = 'mock'; // 'mock' or 'real'
let timerInterval = null;
let examStartedAt = null;

// ===================== Start Screen =====================

document.getElementById('mockExamBtn').addEventListener('click', () => startExam('mock'));
document.getElementById('realExamBtn').addEventListener('click', () => startExam('real'));

function startExam(mode) {
    examMode = mode;
    examStartedAt = new Date().toISOString();

    // Hide start screen, show exam content
    document.getElementById('startScreen').classList.add('hidden');
    const examContent = document.getElementById('examContent');
    examContent.classList.remove('hidden');

    // Update label
    const label = document.getElementById('examTypeLabel');
    label.textContent = mode === 'mock' ? 'امتحان تجريبي' : 'امتحان رسمي';

    // Show/hide timer
    const timerDisplay = document.getElementById('timerDisplay');
    if (mode === 'real') {
        timerDisplay.style.display = 'inline-flex';
        startTimer(15 * 60); // 15 minutes
    } else {
        timerDisplay.style.display = 'none';
    }

    // Load questions
    loadQuestions();
}

// ===================== Load Questions =====================

async function loadQuestions() {
    try {
        const response = await fetch("./data/questions.json");
        if (!response.ok) {
            throw new Error("Failed to load questions");
        }
        let allQuestions = await response.json();
        console.log("Questions Loaded:", allQuestions.length);

        if (examMode === 'real') {
            // Randomly select 30 questions
            questions = shuffleArray(allQuestions).slice(0, 30);
        } else {
            questions = allQuestions;
        }

        buildPalette();
        showQuestion();
        updateStats();
    } catch (error) {
        console.error(error);
        const main = document.querySelector(".main-content");
        if (main) {
            main.innerHTML = `
                <div class="question-card">
                    <div class="question-body">
                        <h2>فشل تحميل الأسئلة</h2>
                        <p>Failed to load questions</p>
                    </div>
                </div>
            `;
        }
    }
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===================== Palette =====================

function buildPalette() {
    const palette = document.getElementById("questionPalette");
    if (!palette) return;
    palette.innerHTML = "";
    questions.forEach((q, idx) => {
        const btn = document.createElement("button");
        btn.textContent = idx + 1;
        btn.setAttribute("data-index", idx);
        btn.addEventListener("click", () => goToQuestion(idx));
        palette.appendChild(btn);
    });
    const totalQ = document.getElementById("totalQ");
    if (totalQ) totalQ.textContent = questions.length;
    const totalQuestions = document.getElementById("totalQuestions");
    if (totalQuestions) totalQuestions.textContent = questions.length;
}

function updatePalette() {
    const buttons = document.querySelectorAll("#questionPalette button");
    buttons.forEach((btn, idx) => {
        btn.classList.remove("current", "correct", "wrong", "unanswered", "answered");
        if (idx === currentQuestion) {
            btn.classList.add("current");
        } else if (userAnswers[idx] !== undefined) {
            if (examMode === 'mock') {
                btn.classList.add(userAnswers[idx] === questions[idx].correctAnswer ? "correct" : "wrong");
            } else {
                btn.classList.add("answered");
            }
        } else {
            btn.classList.add("unanswered");
        }
    });
    const currentQEl = document.getElementById("currentQ");
    if (currentQEl) currentQEl.textContent = currentQuestion + 1;
}

// ===================== Show Question =====================

function showQuestion() {
    if (!questions.length) return;
    const question = questions[currentQuestion];

    document.getElementById("questionArabic").textContent = question.arabic;
    document.getElementById("questionEnglish").textContent = question.english;
    document.getElementById("questionNumber").textContent = `السؤال ${currentQuestion + 1} من ${questions.length}`;
    document.getElementById("currentQuestion").textContent = currentQuestion + 1;
    document.getElementById("totalQuestions").textContent = questions.length;

    const answerCards = document.querySelectorAll(".answer-card");
    answerCards.forEach(card => card.classList.remove("selected", "correct", "wrong"));

    const feedbackCard = document.getElementById("feedbackCard");
    feedbackCard.classList.add("hidden");
    feedbackCard.classList.remove("correct", "wrong");

    const badge = document.getElementById("questionBadge");
    badge.className = "question-badge unanswered";
    badge.textContent = "بدون إجابة";

    if (userAnswers[currentQuestion] !== undefined) {
        const selected = document.querySelector(`.answer-card[data-answer="${userAnswers[currentQuestion]}"]`);
        if (selected) {
            selected.classList.add("selected");
            if (examMode === 'mock') {
                showFeedback(question, userAnswers[currentQuestion]);
            } else {
                // In real exam, show "answered" badge
                badge.className = "question-badge answered";
                badge.textContent = "تم الإجابة";
            }
        }
    }

    // In real exam mode, hide the feedback card and disable click feedback
    if (examMode === 'real' && !examFinished) {
        feedbackCard.classList.add("hidden");
    }

    updateStats();
    updatePalette();
    updateNavigation();
}

function showFeedback(question, answer) {
    const feedbackCard = document.getElementById("feedbackCard");
    const feedbackTitle = document.getElementById("feedbackTitle");
    const correctAnswerSpan = document.getElementById("correctAnswer");
    const explanation = document.getElementById("explanation");
    const reference = document.getElementById("reference");
    const badge = document.getElementById("questionBadge");

    feedbackCard.classList.remove("hidden");
    feedbackCard.classList.remove("correct", "wrong");

    if (answer === question.correctAnswer) {
        feedbackCard.classList.add("correct");
        feedbackTitle.textContent = "إجابة صحيحة";
        document.querySelector(".feedback-header i").className = "fa-solid fa-circle-check";
        badge.className = "question-badge correct";
        badge.textContent = "صحيح";
    } else {
        feedbackCard.classList.add("wrong");
        feedbackTitle.textContent = "إجابة خاطئة";
        document.querySelector(".feedback-header i").className = "fa-solid fa-circle-xmark";
        badge.className = "question-badge wrong";
        badge.textContent = "خطأ";
    }

    correctAnswerSpan.textContent = question.correctAnswer ? "صحيح" : "خطأ";
    explanation.textContent = question.explanation;
    reference.textContent = `${question.reference.article} | ص. ${question.reference.page}`;
}

// ===================== Select Answer =====================

function selectAnswer(answer) {
    if (examFinished) return;
    if (userAnswers[currentQuestion] !== undefined) return;

    const question = questions[currentQuestion];
    userAnswers[currentQuestion] = answer;

    const answerCards = document.querySelectorAll(".answer-card");
    answerCards.forEach(card => {
        const val = card.getAttribute("data-answer") === "true";
        if (val === answer) {
            card.classList.add("selected");
            if (examMode === 'mock') {
                card.classList.add(answer === question.correctAnswer ? "correct" : "wrong");
            }
        }
    });

    if (examMode === 'mock') {
        showFeedback(question, answer);
    }

    updateStats();
    updatePalette();
}

// ===================== Stats =====================

function updateStats() {
    let correct = 0;
    let wrong = 0;
    questions.forEach((q, idx) => {
        if (userAnswers[idx] !== undefined) {
            if (userAnswers[idx] === q.correctAnswer) correct++;
            else wrong++;
        }
    });

    const answered = correct + wrong;
    const remaining = questions.length - answered;
    const percent = questions.length ? Math.round((answered / questions.length) * 100) : 0;

    const correctCountEl = document.getElementById("correctCount");
    const wrongCountEl = document.getElementById("wrongCount");
    const remainingCountEl = document.getElementById("remainingCount");
    const progressPercentEl = document.getElementById("progressPercent");
    const progressFillEl = document.querySelector(".progress-fill");

    if (correctCountEl) correctCountEl.textContent = correct;
    if (wrongCountEl) wrongCountEl.textContent = wrong;
    if (remainingCountEl) remainingCountEl.textContent = remaining;
    if (progressPercentEl) progressPercentEl.textContent = `${percent}%`;
    if (progressFillEl) progressFillEl.style.width = `${percent}%`;
}

// ===================== Navigation =====================

function updateNavigation() {
    const prevBtn = document.getElementById("previousQuestion");
    const nextBtn = document.getElementById("nextQuestion");
    if (prevBtn) prevBtn.disabled = currentQuestion === 0;
    if (nextBtn) nextBtn.disabled = currentQuestion === questions.length - 1;
}

function goToQuestion(index) {
    if (index < 0 || index >= questions.length) return;
    currentQuestion = index;
    showQuestion();
}

function nextQuestion() {
    goToQuestion(currentQuestion + 1);
}

function previousQuestion() {
    goToQuestion(currentQuestion - 1);
}

// ===================== Timer =====================

function startTimer(duration) {
    const timerEl = document.getElementById("timer");
    const timerDisplay = document.getElementById("timerDisplay");
    let timeLeft = duration;

    function updateTimer() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Visual warning states
        timerDisplay.classList.remove('warning', 'danger');
        if (timeLeft <= 60) {
            timerDisplay.classList.add('danger');
        } else if (timeLeft <= 300) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            finishExam();
        }

        timeLeft--;
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);
}

// ===================== Finish Exam =====================

function finishExam() {
    if (examFinished) return;
    examFinished = true;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    let correct = 0;
    let wrong = 0;
    questions.forEach((q, idx) => {
        if (userAnswers[idx] !== undefined) {
            if (userAnswers[idx] === q.correctAnswer) correct++;
            else wrong++;
        }
    });

    const total = questions.length;
    const percentage = Math.round((correct / total) * 100);

    // Send result to parent platform (if embedded in iframe)
    sendExamResultToParent(correct, wrong, total, percentage);

    // For real exam mode: show all answers and feedback
    if (examMode === 'real') {
        // Show the full review with all answers
        showRealExamResults(correct, wrong, total, percentage);
        return;
    }

    // Mock exam finish (existing behavior)
    const main = document.querySelector(".main-content");
    main.innerHTML = `
        <div class="question-card" style="text-align:center; padding:28px;">
            <h2 style="font-family:'Playfair Display','Cairo',serif; font-size:22px; margin-bottom:20px; color:var(--foreground); font-weight:800;">انتهى الامتحان</h2>
            <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-bottom:20px;">
                <div class="stat success" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>صحيحة</span>
                    <h3>${correct}</h3>
                </div>
                <div class="stat danger" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span>خاطئة</span>
                    <h3>${wrong}</h3>
                </div>
                <div class="stat warning" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle"></i>
                    <span>النسبة</span>
                    <h3>${percentage}%</h3>
                </div>
            </div>
            <p style="margin-bottom:20px; font-size:15px; color:var(--muted-foreground);">
                ${percentage >= 60 ? "أحسنت! لقد نجحت في الامتحان." : "للأسف، لم تحقق النجاح. حاول مرة أخرى."}
            </p>
            <button id="restartExam" class="mock-restart-btn" style="background:var(--primary); color:var(--primary-foreground); padding:12px 24px; border-radius:var(--radius); font-size:14px; font-weight:700; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all .3s ease; box-shadow:0 2px 8px rgba(15,23,42,.08);">
                <i class="fa-solid fa-rotate-right"></i>
                إعادة الامتحان
            </button>
        </div>
    `;

    document.getElementById("finishExam").style.display = "none";
    document.getElementById("timerDisplay").style.display = "none";

    document.getElementById("restartExam").addEventListener("click", restartExam);
}

// ===================== Send Result to Parent Platform =====================

function sendExamResultToParent(correct, wrong, total, percentage) {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: "EXAM_COMPLETE",
                score: correct,
                wrong: wrong,
                totalQuestions: total,
                percentage: percentage,
                passed: percentage >= 60,
                examType: examMode === 'real' ? 'kumite-official' : 'kumite-practice',
                startedAt: examStartedAt,
                completedAt: new Date().toISOString(),
                examMode: examMode
            }, "*");
            console.log("Exam result sent to parent platform:", { correct, total, percentage });
        }
    } catch (e) {
        console.log("Could not send result to parent (not in iframe):", e);
    }
}

function showRealExamResults(correct, wrong, total, percentage) {
    // Hide navigation, palette, progress, finish button
    document.querySelector('.navigation').style.display = 'none';
    document.querySelector('.palette-section').style.display = 'none';
    document.querySelector('.progress-section').style.display = 'none';
    document.getElementById("finishExam").style.display = "none";
    document.getElementById("timerDisplay").style.display = "none";

    const main = document.querySelector(".main-content");

    // Build full review of all questions
    let questionsHtml = '';
    questions.forEach((q, idx) => {
        const userAns = userAnswers[idx];
        const isCorrect = userAns !== undefined && userAns === q.correctAnswer;
        const statusIcon = userAns === undefined
            ? '<i class="fa-solid fa-minus-circle" style="color:var(--gray500);"></i>'
            : isCorrect
                ? '<i class="fa-solid fa-circle-check" style="color:var(--success);"></i>'
                : '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i>';
        const statusText = userAns === undefined
            ? 'لم تتم الإجابة'
            : isCorrect
                ? 'إجابة صحيحة'
                : 'إجابة خاطئة';
        const statusClass = userAns === undefined ? '' : isCorrect ? 'correct' : 'wrong';
        const correctAnsText = q.correctAnswer ? 'صحيح' : 'خطأ';

        questionsHtml += `
            <div class="review-item ${statusClass}" style="background:var(--card); border-radius:var(--radius-lg); padding:20px 24px; border:1px solid var(--border); box-shadow:var(--shadow-soft);">
                <div class="review-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span style="font-weight:700; font-size:14px; color:var(--muted-foreground);">السؤال ${idx + 1}</span>
                    <span style="font-weight:700; font-size:13px; display:flex; align-items:center; gap:6px; ${statusClass === 'correct' ? 'color:var(--success);' : statusClass === 'wrong' ? 'color:var(--danger);' : 'color:var(--muted-foreground);'}">
                        ${statusIcon} ${statusText}
                    </span>
                </div>
                <h3 style="font-size:18px; line-height:1.8; color:var(--foreground); font-weight:700; margin-bottom:10px;">${q.arabic}</h3>
                <p style="font-size:14px; color:var(--muted-foreground); line-height:1.9; direction:ltr; text-align:left; margin-bottom:12px; border-top:1px dashed var(--border); padding-top:12px;">${q.english}</p>
                <div style="display:flex; gap:12px; flex-wrap:wrap; font-size:14px;">
                    <span style="font-weight:600; color:var(--foreground);">الإجابة الصحيحة: <strong style="color:var(--success);">${correctAnsText}</strong></span>
                    ${userAns !== undefined ? `<span style="font-weight:600; color:var(--foreground);">إجابتك: <strong style="color:${isCorrect ? 'var(--success)' : 'var(--danger)'};">${userAns ? 'صحيح' : 'خطأ'}</strong></span>` : ''}
                </div>
                <div style="margin-top:12px; padding-top:12px; border-top:1px solid var(--border); font-size:14px; color:var(--foreground); line-height:1.9;">
                    <p><strong>التفسير:</strong> ${q.explanation}</p>
                    <p style="margin-top:6px; color:var(--muted-foreground);"><strong>المرجع:</strong> ${q.reference.article} | ص. ${q.reference.page}</p>
                </div>
            </div>
        `;
    });

    main.innerHTML = `
        <div class="question-card" style="text-align:center; padding:28px; margin-bottom:20px;">
            <h2 style="font-family:'Playfair Display','Cairo',serif; font-size:22px; margin-bottom:20px; color:var(--foreground); font-weight:800;">انتهى الامتحان الرسمي</h2>
            <div style="display:flex; justify-content:center; gap:16px; flex-wrap:wrap; margin-bottom:20px;">
                <div class="stat success" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle-check"></i>
                    <span>صحيحة</span>
                    <h3>${correct}</h3>
                </div>
                <div class="stat danger" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle-xmark"></i>
                    <span>خاطئة</span>
                    <h3>${wrong}</h3>
                </div>
                <div class="stat warning" style="flex:1; min-width:100px; padding:14px;">
                    <i class="fa-solid fa-circle"></i>
                    <span>النسبة</span>
                    <h3>${percentage}%</h3>
                </div>
            </div>
            <p style="margin-bottom:20px; font-size:15px; color:var(--muted-foreground);">
                ${percentage >= 60 ? "أحسنت! لقد نجحت في الامتحان." : "للأسف، لم تحقق النجاح. حاول مرة أخرى."}
            </p>
            <button id="restartExam" class="real-restart-btn" style="background:var(--primary); color:var(--primary-foreground); padding:12px 24px; border-radius:var(--radius); font-size:14px; font-weight:700; border:none; cursor:pointer; display:inline-flex; align-items:center; gap:8px; transition:all .3s ease; box-shadow:0 2px 8px rgba(15,23,42,.08);">
                <i class="fa-solid fa-rotate-right"></i>
                العودة إلى الصفحة الرئيسية
            </button>
        </div>
        <div class="review-list" style="display:flex; flex-direction:column; gap:20px; margin-bottom:20px;">
            ${questionsHtml}
        </div>
    `;

    document.getElementById("restartExam").addEventListener("click", restartExam);
}

function restartExam() {
    window.location.reload();
}

// ===================== Event Listeners =====================

document.addEventListener("DOMContentLoaded", () => {
    const yearEl = document.getElementById("currentYear");
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    document.querySelectorAll(".answer-card").forEach(card => {
        card.addEventListener("click", () => {
            const answer = card.getAttribute("data-answer") === "true";
            selectAnswer(answer);
        });
    });

    const prevBtn = document.getElementById("previousQuestion");
    const nextBtn = document.getElementById("nextQuestion");
    const finishBtn = document.getElementById("finishExam");

    if (prevBtn) prevBtn.addEventListener("click", previousQuestion);
    if (nextBtn) nextBtn.addEventListener("click", nextQuestion);
    if (finishBtn) finishBtn.addEventListener("click", finishExam);

    // ===================== Keyboard Navigation =====================

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") {
            previousQuestion();
        } else if (e.key === "ArrowRight") {
            nextQuestion();
        }
    });

    // ===================== Touch Swipe Navigation =====================

    let touchStartX = 0;
    let touchEndX = 0;
    const swipeThreshold = 50; // minimum distance in px

    document.addEventListener("touchstart", (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchStartX - touchEndX;
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left → next question
                nextQuestion();
            } else {
                // Swipe right → previous question
                previousQuestion();
            }
        }
    }, { passive: true });
});
