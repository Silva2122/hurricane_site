(function () {
  const payload = window.MANAGEMENT_QUESTIONS || { metadata: {}, questions: [] };
  const originalQuestions = payload.questions || [];
  const bossFightSize = 10;
  const correctPhrases = [
    "Менеджмент тебя боится.",
    "Минцберг одобряет.",
    "Еще один шаг к автомату.",
    "Зачетка довольно улыбается.",
    "Так держать, управленец.",
  ];
  const wrongPhrases = [
    "Ничего, сейчас переуправим ситуацию.",
    "Планирование пошло не по плану.",
    "Контроль качества проснулся.",
    "Бедолага из интернета снова под подозрением.",
    "Еще круг, и будет красиво.",
  ];
  const bossWinPhrases = [
    "Босс повержен. Можно дышать.",
    "Преподавательский щит пробит.",
    "Десять из десяти. Это уже стиль.",
  ];
  const rankDefinitions = [
    { min: 0, title: "Первокурсник" },
    { min: 5, title: "Староста" },
    { min: 15, title: "Замдекана" },
    { min: 30, title: "Магистр менеджмента" },
    { min: 60, title: "Легенда зачётки" },
    { min: 100, title: "Декан менеджмента" },
  ];
  const achievementDefinitions = [
    {
      id: "first-correct",
      icon: "1",
      title: "Первый правильный",
      description: "Ответить верно хотя бы один раз.",
    },
    {
      id: "streak-5",
      icon: "5",
      title: "Пять подряд",
      description: "Собрать серию из 5 правильных ответов.",
    },
    {
      id: "streak-10",
      icon: "10",
      title: "Десять подряд",
      description: "Собрать серию из 10 правильных ответов.",
    },
    {
      id: "boss-win",
      icon: "B",
      title: "Босс повержен",
      description: "Пройти босс-файт без ошибок.",
    },
    {
      id: "stress",
      icon: "Z",
      title: "Антистресс активирован",
      description: "Поставить первый штамп зачета.",
    },
    {
      id: "game-2048",
      icon: "2K",
      title: "2048 вместо учебы",
      description: "Открыть мини-игру 2048.",
    },
    {
      id: "secret-mode",
      icon: "S",
      title: "Зачётная легенда",
      description: "Найти секретный режим тренажера.",
    },
  ];
  const stressLabels = ["зачёт", "автомат", "Минцберг", "не списывал", "контроль", "5/5", "допущен"];
  const stressColors = ["#207a3f", "#1f2937", "#b42333", "#667085", "#8a6f2a"];

  let questions = [...originalQuestions];
  let currentIndex = 0;
  let selectedLetters = new Set();
  let revealed = false;
  let mode = "practice";
  let marathonFailed = false;
  let bossComplete = false;
  let results = new Map();
  let activeQuestionId = "";
  let sequenceOrder = [];
  let matchingSelections = {};
  let sequenceDrag = null;
  let gameBoard = Array(16).fill(0);
  let gameScore = 0;
  let gameBest = loadGameBest();
  let gameWon = false;
  let gameOver = false;
  let gameTouch = null;
  let correctStreak = 0;
  let totalCorrect = loadNumber("management-total-correct");
  let titleClicks = 0;
  let secretMode = loadBoolean("management-secret-mode");
  let unlockedAchievements = loadUnlockedAchievements();

  const nodes = {
    answeredCount: document.getElementById("answered-count"),
    totalCount: document.getElementById("total-count"),
    questionCounter: document.getElementById("question-counter"),
    questionMode: document.getElementById("question-mode"),
    questionImageWrap: document.getElementById("question-image-wrap"),
    questionImage: document.getElementById("question-image"),
    trainerTitle: document.getElementById("trainer-title"),
    questionTitle: document.getElementById("question-title"),
    options: document.getElementById("options"),
    answerPanel: document.getElementById("answer-panel"),
    answerResult: document.getElementById("answer-result"),
    answerText: document.getElementById("answer-text"),
    practiceModeButton: document.getElementById("practice-mode-button"),
    marathonModeButton: document.getElementById("marathon-mode-button"),
    bossModeButton: document.getElementById("boss-mode-button"),
    rankTitle: document.getElementById("rank-title"),
    rankProgress: document.getElementById("rank-progress"),
    comboCard: document.getElementById("combo-card"),
    comboCount: document.getElementById("combo-count"),
    comboFill: document.getElementById("combo-fill"),
    checkButton: document.getElementById("check-button"),
    showAnswerButton: document.getElementById("show-answer-button"),
    nextButton: document.getElementById("next-button"),
    restartButton: document.getElementById("restart-button"),
    resetButton: document.getElementById("reset-button"),
    shuffleButton: document.getElementById("shuffle-button"),
    questionGrid: document.getElementById("question-grid"),
    musicToggle: document.getElementById("music-toggle"),
    musicPanel: document.getElementById("music-panel"),
    musicStop: document.getElementById("music-stop"),
    musicStatus: document.getElementById("music-status"),
    musicVolume: document.getElementById("music-volume"),
    musicVolumeValue: document.getElementById("music-volume-value"),
    musicAudio: document.getElementById("music-audio"),
    musicTracks: [...document.querySelectorAll(".music-track")],
    gameToggle: document.getElementById("game-toggle"),
    gameModal: document.getElementById("game-modal"),
    gameClose: document.getElementById("game-close"),
    gameNew: document.getElementById("game-new"),
    gameScore: document.getElementById("game-score"),
    gameBest: document.getElementById("game-best"),
    gameStatus: document.getElementById("game-status"),
    gameBoard: document.getElementById("game-board"),
    gameControls: [...document.querySelectorAll("[data-game-move]")],
    achievementsToggle: document.getElementById("achievements-toggle"),
    achievementsModal: document.getElementById("achievements-modal"),
    achievementsClose: document.getElementById("achievements-close"),
    achievementsList: document.getElementById("achievements-list"),
    achievementToasts: document.getElementById("achievement-toasts"),
    stressToggle: document.getElementById("stress-toggle"),
    stressModal: document.getElementById("stress-modal"),
    stressClose: document.getElementById("stress-close"),
    stressPad: document.getElementById("stress-pad"),
    stressClear: document.getElementById("stress-clear"),
  };

  function currentQuestion() {
    return questions[currentIndex];
  }

  function isMulti(question) {
    return question.correctLetters.length > 1;
  }

  function isChoice(question) {
    return question.kind === "choice";
  }

  function resultKey(question) {
    return question.id || `${question.sectionKey}-${question.number}`;
  }

  function resetInteraction() {
    activeQuestionId = "";
    selectedLetters = new Set();
    sequenceOrder = [];
    matchingSelections = {};
    sequenceDrag = null;
    revealed = false;
  }

  function ensureInteraction(question) {
    const key = resultKey(question);
    if (activeQuestionId === key) {
      return;
    }

    activeQuestionId = key;
    selectedLetters = new Set();
    sequenceOrder = question.options.map((option) => option.letter);
    matchingSelections = {};
    (question.matchingPairs || []).forEach((pair) => {
      matchingSelections[pair.id] = new Set();
    });
  }

  function sameLetters(selected, correct) {
    return selected.length === correct.length && selected.every((letter) => correct.includes(letter));
  }

  function sameOrderedLetters(selected, correct) {
    return selected.length === correct.length && selected.every((letter, index) => letter === correct[index]);
  }

  function render() {
    if (!questions.length) {
      nodes.questionTitle.textContent = "Не удалось загрузить вопросы.";
      return;
    }

    const question = currentQuestion();
    ensureInteraction(question);
    const answered = results.size;

    nodes.practiceModeButton.classList.toggle("active", mode === "practice");
    nodes.marathonModeButton.classList.toggle("active", mode === "marathon");
    nodes.bossModeButton.classList.toggle("active", mode === "boss");
    renderProgress();
    nodes.answeredCount.textContent = answered.toString();
    nodes.totalCount.textContent = questions.length.toString();
    nodes.questionCounter.textContent = `Вопрос ${currentIndex + 1} из ${questions.length} · ${question.displayNumber}`;
    nodes.questionMode.textContent = getQuestionModeLabel(question);
    renderQuestionImage(question);
    nodes.questionTitle.textContent = question.question;

    renderOptions(question);
    renderAnswer(question);
    renderActions(question);
    renderGrid();
  }

  function renderQuestionImage(question) {
    if (!question.image) {
      nodes.questionImageWrap.hidden = true;
      nodes.questionImage.removeAttribute("src");
      nodes.questionImage.alt = "";
      return;
    }

    nodes.questionImageWrap.hidden = false;
    nodes.questionImage.src = question.image.src;
    nodes.questionImage.alt = question.image.alt || "";
  }

  function getQuestionModeLabel(question) {
    const kindLabels = {
      choice: isMulti(question) ? "несколько правильных" : "один правильный",
      sequence: "последовательность",
      matching: "соответствие",
    };
    const answerMode = kindLabels[question.kind] || "вопрос";
    if (mode === "marathon") {
      return `Марафон · ${answerMode}`;
    }
    if (mode === "boss") {
      return `Босс-файт · ${answerMode}`;
    }
    if (!isChoice(question)) {
      return question.kind === "sequence" ? "Задание на последовательность" : "Задание на соответствие";
    }
    return isMulti(question) ? "Несколько правильных ответов" : "Один правильный ответ";
  }

  function renderOptions(question) {
    nodes.options.innerHTML = "";

    if (question.kind === "sequence") {
      renderSequenceOptions(question);
      return;
    }

    if (question.kind === "matching") {
      renderMatchingOptions(question);
      return;
    }

    renderChoiceOptions(question);
  }

  function renderChoiceOptions(question) {
    if (question.promptItems) {
      const prompt = document.createElement("div");
      prompt.className = "prompt-items";
      prompt.textContent = question.promptItems;
      nodes.options.append(prompt);
    }

    question.options.forEach((option) => {
      const button = document.createElement("button");
      button.className = "option";
      button.type = "button";
      button.disabled = revealed || !isChoice(question);
      button.dataset.letter = option.letter;

      const selected = selectedLetters.has(option.letter);
      const correct = isChoice(question) && question.correctLetters.includes(option.letter);

      if (selected) {
        button.classList.add("selected");
      }
      if (revealed && correct) {
        button.classList.add("correct");
      }
      if (revealed && selected && !correct) {
        button.classList.add("wrong");
      }

      button.innerHTML = `
        <span class="option-letter">${option.letter.toUpperCase()})</span>
        <span>${escapeHtml(option.text)}</span>
      `;

      button.addEventListener("click", () => selectOption(question, option.letter));
      nodes.options.append(button);
    });
  }

  function renderSequenceOptions(question) {
    const list = document.createElement("div");
    list.className = "sequence-list";

    sequenceOrder.forEach((letter, index) => {
      const option = question.options.find((item) => item.letter === letter);
      if (!option) {
        return;
      }

      const item = document.createElement("div");
      item.className = "sequence-item";
      item.draggable = false;
      item.dataset.letter = letter;

      if (revealed && question.correctLetters[index] === letter) {
        item.classList.add("correct");
      }
      if (revealed && question.correctLetters[index] !== letter) {
        item.classList.add("wrong");
      }

      item.innerHTML = `
        <div class="sequence-rank">${index + 1}</div>
        <div class="sequence-copy">
          <strong>${letter.toUpperCase()})</strong>
          <span>${escapeHtml(option.text)}</span>
        </div>
        <div class="sequence-controls">
          <button type="button" aria-label="Поднять вариант" ${index === 0 || revealed ? "disabled" : ""}>↑</button>
          <button type="button" aria-label="Опустить вариант" ${index === sequenceOrder.length - 1 || revealed ? "disabled" : ""}>↓</button>
        </div>
      `;

      const [upButton, downButton] = item.querySelectorAll(".sequence-controls button");
      upButton.addEventListener("click", () => moveSequenceItem(index, index - 1));
      downButton.addEventListener("click", () => moveSequenceItem(index, index + 1));

      item.addEventListener("pointerdown", (event) => beginSequenceDrag(event, item, letter));
      item.addEventListener("pointermove", updateSequenceDrag);
      item.addEventListener("pointerup", finishSequenceDrag);
      item.addEventListener("pointercancel", cancelSequenceDrag);
      item.addEventListener("touchstart", (event) => beginSequenceTouchDrag(event, item, letter), {
        passive: false,
      });
      item.addEventListener("touchmove", updateSequenceTouchDrag, { passive: false });
      item.addEventListener("touchend", finishSequenceTouchDrag, { passive: false });
      item.addEventListener("touchcancel", cancelSequenceTouchDrag, { passive: false });

      list.append(item);
    });

    nodes.options.append(list);
  }

  function renderMatchingOptions(question) {
    if (question.promptItems) {
      const prompt = document.createElement("div");
      prompt.className = "prompt-items";
      prompt.textContent = question.promptItems;
      nodes.options.append(prompt);
    }

    const optionsLegend = document.createElement("div");
    optionsLegend.className = "matching-options";
    question.options.forEach((option) => {
      const optionNode = document.createElement("div");
      optionNode.className = "matching-option";
      optionNode.innerHTML = `<strong>${option.letter.toUpperCase()})</strong> ${escapeHtml(option.text)}`;
      optionsLegend.append(optionNode);
    });
    nodes.options.append(optionsLegend);

    const board = document.createElement("div");
    board.className = "matching-board";

    (question.matchingPairs || []).forEach((pair) => {
      const row = document.createElement("div");
      row.className = "matching-row";

      const selected = matchingSelections[pair.id] || new Set();
      const selectedLetters = [...selected].sort();
      const correctLetters = [...pair.letters].sort();
      const rowCorrect = sameLetters(selectedLetters, correctLetters);

      if (revealed) {
        row.classList.add(rowCorrect ? "correct" : "wrong");
      }

      const target = document.createElement("div");
      target.className = "matching-target";
      target.innerHTML = `<strong>${pair.id}</strong><span>${escapeHtml(pair.label)}</span>`;
      row.append(target);

      const choices = document.createElement("div");
      choices.className = "matching-choices";
      question.options.forEach((option) => {
        const chip = document.createElement("button");
        chip.className = "match-chip";
        chip.type = "button";
        chip.textContent = option.letter.toUpperCase();
        chip.disabled = revealed;
        if (selected.has(option.letter)) {
          chip.classList.add("selected");
        }
        if (revealed && pair.letters.includes(option.letter)) {
          chip.classList.add("correct");
        }
        if (revealed && selected.has(option.letter) && !pair.letters.includes(option.letter)) {
          chip.classList.add("wrong");
        }
        chip.addEventListener("click", () => toggleMatchingLetter(pair, option.letter));
        choices.append(chip);
      });
      row.append(choices);
      board.append(row);
    });

    nodes.options.append(board);
  }

  function selectOption(question, letter) {
    if (revealed || !isChoice(question)) {
      return;
    }

    if (isMulti(question)) {
      if (selectedLetters.has(letter)) {
        selectedLetters.delete(letter);
      } else {
        selectedLetters.add(letter);
      }
      render();
      return;
    }

    selectedLetters = new Set([letter]);
    revealAnswer();
  }

  function moveSequenceItem(fromIndex, toIndex) {
    if (revealed || toIndex < 0 || toIndex >= sequenceOrder.length) {
      return;
    }

    const nextOrder = [...sequenceOrder];
    const [item] = nextOrder.splice(fromIndex, 1);
    nextOrder.splice(toIndex, 0, item);
    sequenceOrder = nextOrder;
    render();
  }

  function moveSequenceLetter(draggedLetter, targetLetter) {
    if (revealed || !draggedLetter || draggedLetter === targetLetter) {
      return;
    }

    const nextOrder = sequenceOrder.filter((letter) => letter !== draggedLetter);
    const targetIndex = nextOrder.indexOf(targetLetter);
    nextOrder.splice(targetIndex, 0, draggedLetter);
    sequenceOrder = nextOrder;
    render();
  }

  function beginSequenceDrag(event, item, letter) {
    if (revealed || event.target.closest("button")) {
      return;
    }

    sequenceDrag = {
      pointerId: event.pointerId,
      letter,
      item,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    item.setPointerCapture(event.pointerId);
  }

  function beginSequenceTouchDrag(event, item, letter) {
    if (window.PointerEvent || revealed || event.target.closest("button")) {
      return;
    }

    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    sequenceDrag = {
      pointerId: touch.identifier,
      letter,
      item,
      startX: touch.clientX,
      startY: touch.clientY,
      active: false,
    };
  }

  function updateSequenceDrag(event) {
    if (!sequenceDrag || sequenceDrag.pointerId !== event.pointerId) {
      return;
    }

    updateSequenceDragPosition(event.clientX, event.clientY, event);
  }

  function updateSequenceTouchDrag(event) {
    if (window.PointerEvent || !sequenceDrag) {
      return;
    }

    const touch = [...event.touches].find((item) => item.identifier === sequenceDrag.pointerId);
    if (!touch) {
      return;
    }

    updateSequenceDragPosition(touch.clientX, touch.clientY, event);
  }

  function updateSequenceDragPosition(clientX, clientY, event) {
    const dx = Math.abs(clientX - sequenceDrag.startX);
    const dy = Math.abs(clientY - sequenceDrag.startY);
    if (!sequenceDrag.active && dx + dy > 10) {
      sequenceDrag.active = true;
      sequenceDrag.item.classList.add("dragging");
    }

    if (sequenceDrag.active) {
      event.preventDefault();
      sequenceDrag.item.style.transform = `translateY(${clientY - sequenceDrag.startY}px)`;
    }
  }

  function finishSequenceDrag(event) {
    if (!sequenceDrag || sequenceDrag.pointerId !== event.pointerId) {
      return;
    }

    const drag = sequenceDrag;
    cleanupSequenceDrag();

    if (!drag.active) {
      return;
    }

    finishSequenceDragAt(drag, event.clientY);
  }

  function finishSequenceTouchDrag(event) {
    if (window.PointerEvent || !sequenceDrag) {
      return;
    }

    const touch = [...event.changedTouches].find((item) => item.identifier === sequenceDrag.pointerId);
    const drag = sequenceDrag;
    cleanupSequenceDrag();

    if (!drag.active || !touch) {
      return;
    }

    finishSequenceDragAt(drag, touch.clientY);
  }

  function finishSequenceDragAt(drag, clientY) {
    const list = nodes.options.querySelector(".sequence-list");
    const otherItems = [...list.querySelectorAll(".sequence-item")].filter(
      (item) => item.dataset.letter !== drag.letter
    );
    const insertIndex = otherItems.findIndex((item) => {
      const rect = item.getBoundingClientRect();
      return clientY < rect.top + rect.height / 2;
    });
    const nextOrder = sequenceOrder.filter((letter) => letter !== drag.letter);
    nextOrder.splice(insertIndex === -1 ? nextOrder.length : insertIndex, 0, drag.letter);
    sequenceOrder = nextOrder;
    render();
  }

  function cancelSequenceDrag(event) {
    if (sequenceDrag && sequenceDrag.pointerId === event.pointerId) {
      cleanupSequenceDrag();
    }
  }

  function cancelSequenceTouchDrag() {
    if (!window.PointerEvent) {
      cleanupSequenceDrag();
    }
  }

  function cleanupSequenceDrag() {
    if (!sequenceDrag) {
      return;
    }

    sequenceDrag.item.classList.remove("dragging");
    sequenceDrag.item.style.transform = "";
    sequenceDrag = null;
  }

  function toggleMatchingLetter(pair, letter) {
    if (revealed) {
      return;
    }

    const current = new Set(matchingSelections[pair.id] || []);
    if (current.has(letter)) {
      current.delete(letter);
    } else if (pair.letters.length === 1) {
      current.clear();
      current.add(letter);
    } else {
      current.add(letter);
    }
    matchingSelections[pair.id] = current;
    render();
  }

  function renderAnswer(question) {
    nodes.answerPanel.hidden = !revealed;
    const result = results.get(resultKey(question));
    const isWrong = revealed && result && result.correct === false;
    nodes.answerPanel.classList.toggle("is-wrong", isWrong);
    nodes.answerPanel.classList.toggle("is-neutral", revealed && !isChoice(question) && !isWrong);

    if (!revealed) {
      nodes.answerResult.textContent = "";
      nodes.answerText.textContent = "";
      return;
    }

    if (isCurrentCorrect(question)) {
      nodes.answerResult.textContent = bossComplete ? "Босс повержен" : "Верно";
      nodes.answerText.textContent = buildAnswerText(
        question,
        result && result.phrase ? result.phrase : getRandomPhrase(correctPhrases)
      );
      return;
    }

    nodes.answerResult.textContent =
      mode === "marathon"
        ? "Ошибка. Марафон начинается заново"
        : mode === "boss"
          ? "Босс-файт провален"
          : "Неверно";
    nodes.answerText.textContent = buildAnswerText(
      question,
      result && result.phrase ? result.phrase : getRandomPhrase(wrongPhrases)
    );
  }

  function renderActions(question) {
    const hasSelection = selectedLetters.size > 0;
    const structured = !isChoice(question);
    nodes.checkButton.hidden = revealed || (!structured && !isMulti(question));
    nodes.checkButton.disabled = isCheckDisabled(question, hasSelection);
    nodes.showAnswerButton.hidden = !structured || revealed;
    nodes.nextButton.hidden = !revealed || marathonFailed || bossComplete;
    nodes.restartButton.hidden = !(marathonFailed || bossComplete);
    nodes.restartButton.textContent = bossComplete ? "Еще один босс-файт" : "Начать заново";
    nodes.shuffleButton.disabled = mode !== "practice";
  }

  function isCheckDisabled(question, hasSelection) {
    if (question.kind === "choice") {
      return isMulti(question) && !hasSelection;
    }
    if (question.kind === "sequence") {
      return false;
    }
    if (question.kind === "matching") {
      return (question.matchingPairs || []).some((pair) => {
        const selected = matchingSelections[pair.id];
        return !selected || selected.size === 0;
      });
    }
    return true;
  }

  function renderGrid() {
    nodes.questionGrid.innerHTML = "";

    questions.forEach((question, index) => {
      const button = document.createElement("button");
      button.className = "nav-button";
      button.type = "button";
      button.textContent = question.shortLabel || String(question.number);
      button.title = question.displayNumber || `Вопрос ${question.number}`;
      button.disabled = mode !== "practice";

      if (index === currentIndex) {
        button.classList.add("active");
      }
      if (mode !== "practice") {
        button.classList.add("locked");
      }

      const result = results.get(resultKey(question));
      if (result) {
        button.classList.add(result.correct ? "correct" : "wrong");
      }

      button.addEventListener("click", () => {
        currentIndex = index;
        resetInteraction();
        render();
      });

      nodes.questionGrid.append(button);
    });
  }

  function revealAnswer() {
    const question = currentQuestion();
    const correct = isCurrentCorrect(question);
    revealed = true;
    marathonFailed = (mode === "marathon" || mode === "boss") && !correct;
    bossComplete = mode === "boss" && correct && results.size + 1 >= questions.length;
    results.set(resultKey(question), {
      selected: getCurrentAnswerSnapshot(question),
      correct,
      phrase: getResultPhrase(correct),
    });
    if (correct) {
      correctStreak += 1;
      totalCorrect += 1;
      saveNumber("management-total-correct", totalCorrect);
      unlockAchievement("first-correct");
      if (correctStreak >= 5) {
        unlockAchievement("streak-5");
      }
      if (correctStreak >= 10) {
        unlockAchievement("streak-10");
      }
      if (bossComplete) {
        unlockAchievement("boss-win");
      }
      launchConfetti();
    } else {
      correctStreak = 0;
    }
    render();
  }

  function showStructuredAnswer() {
    const question = currentQuestion();
    revealed = true;
    results.set(resultKey(question), {
      selected: getCurrentAnswerSnapshot(question),
      correct: false,
      phrase: getResultPhrase(false),
    });
    marathonFailed = mode === "marathon" || mode === "boss";
    correctStreak = 0;
    render();
  }

  function isCurrentCorrect(question) {
    if (question.kind === "sequence") {
      return sameOrderedLetters(sequenceOrder, question.correctLetters);
    }
    if (question.kind === "matching") {
      return (question.matchingPairs || []).every((pair) => {
        const selected = [...(matchingSelections[pair.id] || new Set())].sort();
        return sameLetters(selected, [...pair.letters].sort());
      });
    }
    return sameLetters([...selectedLetters].sort(), [...question.correctLetters].sort());
  }

  function getCurrentAnswerSnapshot(question) {
    if (question.kind === "sequence") {
      return [...sequenceOrder];
    }
    if (question.kind === "matching") {
      return Object.fromEntries(
        Object.entries(matchingSelections).map(([key, value]) => [key, [...value]])
      );
    }
    return [...selectedLetters];
  }

  function goNext() {
    if (marathonFailed) {
      restartCurrentRun();
      return;
    }
    currentIndex = (currentIndex + 1) % questions.length;
    resetInteraction();
    render();
  }

  function reset() {
    if (mode === "marathon") {
      restartMarathon();
      return;
    }
    if (mode === "boss") {
      restartBossFight();
      return;
    }

    resetInteraction();
    marathonFailed = false;
    bossComplete = false;
    correctStreak = 0;
    results = new Map();
    currentIndex = 0;
    render();
  }

  function setMode(nextMode) {
    mode = nextMode;
    if (mode === "marathon") {
      restartMarathon();
      return;
    }
    if (mode === "boss") {
      restartBossFight();
      return;
    }

    questions = [...originalQuestions];
    reset();
  }

  function restartMarathon() {
    questions = shuffledQuestions(originalQuestions);
    resetInteraction();
    marathonFailed = false;
    bossComplete = false;
    correctStreak = 0;
    results = new Map();
    currentIndex = 0;
    render();
  }

  function restartBossFight() {
    questions = shuffledQuestions(originalQuestions).slice(0, bossFightSize);
    resetInteraction();
    marathonFailed = false;
    bossComplete = false;
    correctStreak = 0;
    results = new Map();
    currentIndex = 0;
    render();
  }

  function restartCurrentRun() {
    if (mode === "boss") {
      restartBossFight();
      return;
    }
    restartMarathon();
  }

  function shuffle() {
    if (mode !== "practice") {
      return;
    }
    questions = shuffledQuestions(questions);
    currentIndex = 0;
    resetInteraction();
    marathonFailed = false;
    bossComplete = false;
    correctStreak = 0;
    results = new Map();
    render();
  }

  function shuffledQuestions(source) {
    return [...source]
      .map((question) => ({ question, sort: Math.random() }))
      .sort((left, right) => left.sort - right.sort)
      .map((item) => item.question);
  }

  function renderProgress() {
    const rank = getCurrentRank();
    const nextRank = rankDefinitions.find((item) => item.min > totalCorrect);
    const comboProgress = Math.min(correctStreak, 10) * 10;

    nodes.rankTitle.textContent = rank.title;
    nodes.rankProgress.textContent = nextRank
      ? `${totalCorrect} верных · до "${nextRank.title}" еще ${nextRank.min - totalCorrect}`
      : `${totalCorrect} верных · максимальное звание`;
    nodes.comboCount.textContent = `x${correctStreak}`;
    nodes.comboFill.style.width = `${comboProgress}%`;
    nodes.comboCard.classList.toggle("hot", correctStreak >= 5 && correctStreak < 10);
    nodes.comboCard.classList.toggle("fire", correctStreak >= 10);
  }

  function getCurrentRank() {
    return rankDefinitions.reduce((current, rank) => (totalCorrect >= rank.min ? rank : current), rankDefinitions[0]);
  }

  function handleTitleSecretClick() {
    titleClicks += 1;
    if (titleClicks < 7) {
      return;
    }

    titleClicks = 0;
    secretMode = !secretMode;
    applySecretMode();
    saveBoolean("management-secret-mode", secretMode);
    const alreadyUnlocked = unlockedAchievements.has("secret-mode");
    if (secretMode && !alreadyUnlocked) {
      unlockAchievement("secret-mode");
      return;
    }
    showAchievementToast({
      title: secretMode ? "Секретный режим включен" : "Секретный режим выключен",
    });
  }

  function applySecretMode() {
    document.body.classList.toggle("secret-mode", secretMode);
  }

  function buildAnswerText(question, phrase) {
    const answer = isChoice(question) ? `Правильный ответ: ${question.answerText}` : `Ответ: ${question.answerText}`;
    return `${phrase} ${answer}`;
  }

  function getResultPhrase(correct) {
    if (correct && mode === "boss" && results.size + 1 >= questions.length) {
      return getRandomPhrase(bossWinPhrases);
    }
    return getRandomPhrase(correct ? correctPhrases : wrongPhrases);
  }

  function getRandomPhrase(phrases) {
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  function launchConfetti() {
    const colors = ["#207a3f", "#73c987", "#d8c9a6", "#1f2937", "#df5b67"];
    const count = window.matchMedia("(max-width: 620px)").matches ? 28 : 44;

    for (let index = 0; index < count; index += 1) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.style.left = `${45 + Math.random() * 10}%`;
      piece.style.background = colors[index % colors.length];
      piece.style.setProperty("--confetti-x", `${(Math.random() - 0.5) * 520}px`);
      piece.style.setProperty("--confetti-y", `${220 + Math.random() * 260}px`);
      piece.style.setProperty("--confetti-rotate", `${Math.random() * 720 - 360}deg`);
      piece.style.animationDelay = `${Math.random() * 90}ms`;
      document.body.append(piece);
      window.setTimeout(() => piece.remove(), 1100);
    }
  }

  function unlockAchievement(id) {
    if (unlockedAchievements.has(id)) {
      return;
    }

    const achievement = achievementDefinitions.find((item) => item.id === id);
    if (!achievement) {
      return;
    }

    unlockedAchievements.add(id);
    saveUnlockedAchievements();
    renderAchievements();
    showAchievementToast(achievement);
  }

  function renderAchievements() {
    nodes.achievementsList.innerHTML = "";

    achievementDefinitions.forEach((achievement) => {
      const unlocked = unlockedAchievements.has(achievement.id);
      const card = document.createElement("div");
      card.className = "achievement-card";
      card.classList.toggle("unlocked", unlocked);
      card.innerHTML = `
        <div class="achievement-icon">${escapeHtml(unlocked ? achievement.icon : "?")}</div>
        <div class="achievement-copy">
          <strong>${escapeHtml(achievement.title)}</strong>
          <span>${escapeHtml(unlocked ? achievement.description : "Пока закрыто")}</span>
        </div>
      `;
      nodes.achievementsList.append(card);
    });
  }

  function showAchievementToast(achievement) {
    const toast = document.createElement("div");
    toast.className = "achievement-toast";
    toast.innerHTML = `
      <strong>Ачивка получена</strong>
      <span>${escapeHtml(achievement.title)}</span>
    `;
    nodes.achievementToasts.append(toast);
    window.setTimeout(() => toast.remove(), 3400);
  }

  function openAchievements() {
    renderAchievements();
    nodes.achievementsModal.hidden = false;
    nodes.achievementsToggle.classList.add("is-open");
    nodes.achievementsToggle.setAttribute("aria-expanded", "true");
  }

  function closeAchievements() {
    nodes.achievementsModal.hidden = true;
    nodes.achievementsToggle.classList.remove("is-open");
    nodes.achievementsToggle.setAttribute("aria-expanded", "false");
    nodes.achievementsToggle.focus();
  }

  function openStress() {
    nodes.stressModal.hidden = false;
    nodes.stressToggle.classList.add("is-open");
    nodes.stressToggle.setAttribute("aria-expanded", "true");
    nodes.stressPad.focus();
  }

  function closeStress() {
    nodes.stressModal.hidden = true;
    nodes.stressToggle.classList.remove("is-open");
    nodes.stressToggle.setAttribute("aria-expanded", "false");
    nodes.stressToggle.focus();
  }

  function placeStressStamp(event) {
    event.preventDefault();
    const rect = nodes.stressPad.getBoundingClientRect();
    const clientX = event.clientX || rect.left + rect.width / 2;
    const clientY = event.clientY || rect.top + rect.height / 2;
    const stamp = document.createElement("span");
    stamp.className = "stress-stamp";
    stamp.textContent = getRandomPhrase(stressLabels);
    stamp.style.setProperty("--stamp-x", `${clientX - rect.left}px`);
    stamp.style.setProperty("--stamp-y", `${clientY - rect.top}px`);
    stamp.style.setProperty("--stamp-rotate", `${Math.random() * 28 - 14}deg`);
    stamp.style.setProperty("--stamp-color", getRandomPhrase(stressColors));
    nodes.stressPad.append(stamp);
    nodes.stressPad.classList.add("has-stamps");
    unlockAchievement("stress");

    const stamps = nodes.stressPad.querySelectorAll(".stress-stamp");
    if (stamps.length > 26) {
      stamps[0].remove();
    }
  }

  function clearStressStamps() {
    nodes.stressPad.querySelectorAll(".stress-stamp").forEach((stamp) => stamp.remove());
    nodes.stressPad.classList.remove("has-stamps");
  }

  function loadUnlockedAchievements() {
    try {
      return new Set(JSON.parse(window.localStorage.getItem("management-achievements") || "[]"));
    } catch (error) {
      return new Set();
    }
  }

  function saveUnlockedAchievements() {
    try {
      window.localStorage.setItem("management-achievements", JSON.stringify([...unlockedAchievements]));
    } catch (error) {
      // Achievements still work for the current session without storage.
    }
  }

  function loadNumber(key) {
    try {
      return Number(window.localStorage.getItem(key)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveNumber(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      // Progress still works for the current session without storage.
    }
  }

  function loadBoolean(key) {
    try {
      return window.localStorage.getItem(key) === "true";
    } catch (error) {
      return false;
    }
  }

  function saveBoolean(key, value) {
    try {
      window.localStorage.setItem(key, String(value));
    } catch (error) {
      // Secret mode still works for the current session without storage.
    }
  }

  function toggleMusicPanel() {
    const open = nodes.musicPanel.hidden;
    nodes.musicPanel.hidden = !open;
    nodes.musicToggle.setAttribute("aria-expanded", String(open));
  }

  function updateMusicVolume() {
    const value = Number(nodes.musicVolume.value);
    nodes.musicAudio.volume = value / 100;
    nodes.musicVolumeValue.textContent = `${value}%`;
  }

  async function playMusic(track) {
    const src = track.dataset.audioSrc;
    nodes.musicAudio.src = src;
    nodes.musicToggle.classList.add("is-playing");
    nodes.musicStatus.textContent = "Играет: " + track.querySelector("span").textContent;
    nodes.musicTracks.forEach((track) => {
      track.classList.toggle("active", track.dataset.audioSrc === src);
    });

    try {
      await nodes.musicAudio.play();
    } catch (error) {
      nodes.musicToggle.classList.remove("is-playing");
      nodes.musicStatus.textContent = "Браузер не дал стартануть звук. Нажми трек ещё раз.";
    }
  }

  function stopMusic() {
    nodes.musicAudio.pause();
    nodes.musicToggle.classList.remove("is-playing");
    nodes.musicStatus.textContent = "Пауза. Выбери трек, чтобы включить фон.";
    nodes.musicTracks.forEach((track) => track.classList.remove("active"));
  }

  function openGame() {
    nodes.gameModal.hidden = false;
    nodes.gameToggle.classList.add("is-open");
    nodes.gameToggle.setAttribute("aria-expanded", "true");
    unlockAchievement("game-2048");
    window.setTimeout(() => nodes.gameBoard.focus(), 0);
  }

  function closeGame() {
    nodes.gameModal.hidden = true;
    nodes.gameToggle.classList.remove("is-open");
    nodes.gameToggle.setAttribute("aria-expanded", "false");
    nodes.gameToggle.focus();
  }

  function startGame() {
    gameBoard = Array(16).fill(0);
    gameScore = 0;
    gameWon = false;
    gameOver = false;
    addGameTile();
    addGameTile();
    renderGame();
  }

  function addGameTile() {
    const emptyIndexes = gameBoard
      .map((value, index) => (value === 0 ? index : -1))
      .filter((index) => index !== -1);

    if (!emptyIndexes.length) {
      return;
    }

    const index = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];
    gameBoard[index] = Math.random() < 0.9 ? 2 : 4;
  }

  function renderGame() {
    nodes.gameScore.textContent = gameScore.toString();
    nodes.gameBest.textContent = gameBest.toString();
    nodes.gameBoard.innerHTML = "";

    gameBoard.forEach((value) => {
      const tile = document.createElement("div");
      tile.className = "game-tile";
      if (value) {
        tile.dataset.value = value.toString();
        tile.textContent = value.toString();
      }
      nodes.gameBoard.append(tile);
    });

    if (gameOver) {
      nodes.gameStatus.textContent = "Ходов больше нет";
    } else if (gameWon) {
      nodes.gameStatus.textContent = "2048 собрано";
    } else {
      nodes.gameStatus.textContent = "Собери 2048";
    }
  }

  function moveGame(direction) {
    if (gameOver) {
      return;
    }

    const before = gameBoard.join(",");
    const nextBoard = Array(16).fill(0);
    let gained = 0;

    for (let index = 0; index < 4; index += 1) {
      const line = getGameLine(direction, index);
      const values = line.map((position) => gameBoard[position]);
      const merged = mergeGameLine(values);
      gained += merged.score;
      line.forEach((position, lineIndex) => {
        nextBoard[position] = merged.values[lineIndex];
      });
    }

    if (before === nextBoard.join(",")) {
      return;
    }

    gameBoard = nextBoard;
    gameScore += gained;
    if (gameScore > gameBest) {
      gameBest = gameScore;
      saveGameBest(gameBest);
    }

    addGameTile();
    if (gameBoard.includes(2048)) {
      gameWon = true;
    }
    gameOver = !canMoveGame();
    renderGame();
  }

  function getGameLine(direction, index) {
    const lines = {
      left: [0, 1, 2, 3].map((column) => index * 4 + column),
      right: [3, 2, 1, 0].map((column) => index * 4 + column),
      up: [0, 1, 2, 3].map((row) => row * 4 + index),
      down: [3, 2, 1, 0].map((row) => row * 4 + index),
    };
    return lines[direction] || lines.left;
  }

  function mergeGameLine(values) {
    const compact = values.filter(Boolean);
    const merged = [];
    let score = 0;

    for (let index = 0; index < compact.length; index += 1) {
      if (compact[index] === compact[index + 1]) {
        const value = compact[index] * 2;
        merged.push(value);
        score += value;
        index += 1;
      } else {
        merged.push(compact[index]);
      }
    }

    while (merged.length < 4) {
      merged.push(0);
    }

    return { values: merged, score };
  }

  function canMoveGame() {
    if (gameBoard.some((value) => value === 0)) {
      return true;
    }

    return gameBoard.some((value, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      const right = column < 3 && gameBoard[index + 1] === value;
      const down = row < 3 && gameBoard[index + 4] === value;
      return right || down;
    });
  }

  function handleGameKey(event) {
    if (event.key === "Escape") {
      if (!nodes.achievementsModal.hidden) {
        closeAchievements();
        return;
      }
      if (!nodes.stressModal.hidden) {
        closeStress();
        return;
      }
    }

    if (nodes.gameModal.hidden) {
      return;
    }

    const keys = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      s: "down",
      a: "left",
      d: "right",
      ц: "up",
      ы: "down",
      ф: "left",
      в: "right",
    };

    if (event.key === "Escape") {
      closeGame();
      return;
    }

    const direction = keys[event.key];
    if (!direction) {
      return;
    }

    event.preventDefault();
    moveGame(direction);
  }

  function beginGameTouch(event) {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }
    gameTouch = {
      x: touch.clientX,
      y: touch.clientY,
    };
  }

  function finishGameTouch(event) {
    if (!gameTouch) {
      return;
    }

    const touch = event.changedTouches[0];
    const dx = touch.clientX - gameTouch.x;
    const dy = touch.clientY - gameTouch.y;
    gameTouch = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) {
      return;
    }

    event.preventDefault();
    moveGame(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  function loadGameBest() {
    try {
      return Number(window.localStorage.getItem("management-2048-best")) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveGameBest(value) {
    try {
      window.localStorage.setItem("management-2048-best", String(value));
    } catch (error) {
      // The game still works without saved scores.
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  nodes.checkButton.addEventListener("click", revealAnswer);
  nodes.showAnswerButton.addEventListener("click", showStructuredAnswer);
  nodes.nextButton.addEventListener("click", goNext);
  nodes.restartButton.addEventListener("click", restartCurrentRun);
  nodes.resetButton.addEventListener("click", reset);
  nodes.shuffleButton.addEventListener("click", shuffle);
  nodes.trainerTitle.addEventListener("click", handleTitleSecretClick);
  nodes.practiceModeButton.addEventListener("click", () => setMode("practice"));
  nodes.marathonModeButton.addEventListener("click", () => setMode("marathon"));
  nodes.bossModeButton.addEventListener("click", () => setMode("boss"));
  nodes.musicToggle.addEventListener("click", toggleMusicPanel);
  nodes.musicStop.addEventListener("click", stopMusic);
  nodes.musicVolume.addEventListener("input", updateMusicVolume);
  nodes.musicTracks.forEach((track) => {
    track.addEventListener("click", () => playMusic(track));
  });
  nodes.gameToggle.addEventListener("click", openGame);
  nodes.gameClose.addEventListener("click", closeGame);
  nodes.gameNew.addEventListener("click", startGame);
  nodes.gameModal.addEventListener("click", (event) => {
    if (event.target === nodes.gameModal) {
      closeGame();
    }
  });
  nodes.gameBoard.addEventListener("touchstart", beginGameTouch, { passive: true });
  nodes.gameBoard.addEventListener("touchend", finishGameTouch, { passive: false });
  nodes.gameControls.forEach((button) => {
    button.addEventListener("click", () => moveGame(button.dataset.gameMove));
  });
  nodes.achievementsToggle.addEventListener("click", openAchievements);
  nodes.achievementsClose.addEventListener("click", closeAchievements);
  nodes.achievementsModal.addEventListener("click", (event) => {
    if (event.target === nodes.achievementsModal) {
      closeAchievements();
    }
  });
  nodes.stressToggle.addEventListener("click", openStress);
  nodes.stressClose.addEventListener("click", closeStress);
  nodes.stressModal.addEventListener("click", (event) => {
    if (event.target === nodes.stressModal) {
      closeStress();
    }
  });
  nodes.stressPad.addEventListener("pointerdown", placeStressStamp);
  nodes.stressPad.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      placeStressStamp(event);
    }
  });
  nodes.stressClear.addEventListener("click", clearStressStamps);
  window.addEventListener("keydown", handleGameKey);

  updateMusicVolume();
  startGame();
  renderAchievements();
  applySecretMode();
  render();
})();
