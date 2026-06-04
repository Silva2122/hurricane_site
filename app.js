(function () {
  const payload = window.MANAGEMENT_QUESTIONS || { metadata: {}, questions: [] };
  const originalQuestions = payload.questions || [];

  let questions = [...originalQuestions];
  let currentIndex = 0;
  let selectedLetters = new Set();
  let revealed = false;
  let mode = "practice";
  let marathonFailed = false;
  let results = new Map();
  let activeQuestionId = "";
  let sequenceOrder = [];
  let matchingSelections = {};
  let sequenceDrag = null;

  const nodes = {
    answeredCount: document.getElementById("answered-count"),
    totalCount: document.getElementById("total-count"),
    questionCounter: document.getElementById("question-counter"),
    questionMode: document.getElementById("question-mode"),
    questionImageWrap: document.getElementById("question-image-wrap"),
    questionImage: document.getElementById("question-image"),
    questionTitle: document.getElementById("question-title"),
    options: document.getElementById("options"),
    answerPanel: document.getElementById("answer-panel"),
    answerResult: document.getElementById("answer-result"),
    answerText: document.getElementById("answer-text"),
    practiceModeButton: document.getElementById("practice-mode-button"),
    marathonModeButton: document.getElementById("marathon-mode-button"),
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
      nodes.answerResult.textContent = "Верно";
      nodes.answerText.textContent = isChoice(question)
        ? `Правильный ответ: ${question.answerText}`
        : `Ответ: ${question.answerText}`;
      return;
    }

    nodes.answerResult.textContent = mode === "marathon" ? "Ошибка. Марафон начинается заново" : "Неверно";
    nodes.answerText.textContent = isChoice(question)
      ? `Правильный ответ: ${question.answerText}`
      : `Ответ: ${question.answerText}`;
  }

  function renderActions(question) {
    const hasSelection = selectedLetters.size > 0;
    const structured = !isChoice(question);
    nodes.checkButton.hidden = revealed || (!structured && !isMulti(question));
    nodes.checkButton.disabled = isCheckDisabled(question, hasSelection);
    nodes.showAnswerButton.hidden = !structured || revealed;
    nodes.nextButton.hidden = !revealed || marathonFailed;
    nodes.restartButton.hidden = !marathonFailed;
    nodes.shuffleButton.disabled = mode === "marathon";
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
      button.disabled = mode === "marathon";

      if (index === currentIndex) {
        button.classList.add("active");
      }
      if (mode === "marathon") {
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
    marathonFailed = mode === "marathon" && !correct;
    results.set(resultKey(question), {
      selected: getCurrentAnswerSnapshot(question),
      correct,
    });
    render();
  }

  function showStructuredAnswer() {
    const question = currentQuestion();
    revealed = true;
    results.set(resultKey(question), {
      selected: getCurrentAnswerSnapshot(question),
      correct: false,
    });
    marathonFailed = mode === "marathon";
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
      restartMarathon();
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

    resetInteraction();
    marathonFailed = false;
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

    questions = [...originalQuestions];
    reset();
  }

  function restartMarathon() {
    questions = shuffledQuestions(originalQuestions);
    resetInteraction();
    marathonFailed = false;
    results = new Map();
    currentIndex = 0;
    render();
  }

  function shuffle() {
    if (mode === "marathon") {
      return;
    }
    questions = shuffledQuestions(questions);
    currentIndex = 0;
    resetInteraction();
    marathonFailed = false;
    results = new Map();
    render();
  }

  function shuffledQuestions(source) {
    return [...source]
      .map((question) => ({ question, sort: Math.random() }))
      .sort((left, right) => left.sort - right.sort)
      .map((item) => item.question);
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
  nodes.restartButton.addEventListener("click", restartMarathon);
  nodes.resetButton.addEventListener("click", reset);
  nodes.shuffleButton.addEventListener("click", shuffle);
  nodes.practiceModeButton.addEventListener("click", () => setMode("practice"));
  nodes.marathonModeButton.addEventListener("click", () => setMode("marathon"));
  nodes.musicToggle.addEventListener("click", toggleMusicPanel);
  nodes.musicStop.addEventListener("click", stopMusic);
  nodes.musicVolume.addEventListener("input", updateMusicVolume);
  nodes.musicTracks.forEach((track) => {
    track.addEventListener("click", () => playMusic(track));
  });

  updateMusicVolume();
  render();
})();
