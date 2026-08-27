/**
 * Front-end Logic for Hindi Crossword Answer Pad
 * Handles Grid Navigation, Cross-Highlight, Direction Locking,
 * Custom Hindi Keyboard Typing, Auto-Saving API Sync, and Double-Confirmation Submissions.
 */

let puzzleData = {};
let wordStates = {};
let isCompleted = false;
let userObj = {};

let activeWordId = null;
let activeDirection = 'across'; // 'across' or 'down'
let activeCellRow = null;
let activeCellCol = null;

let currentFocusStartTime = null;

// BFCache Navigation Guard (reloads if participant presses phone Back button)
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  const serverDataEl = document.getElementById('server-data');
  if (serverDataEl) {
    try {
      const data = JSON.parse(serverDataEl.textContent);
      puzzleData = data.puzzleData || {};
      wordStates = data.wordStateMap || {};
      isCompleted = !!data.isCompleted;
      userObj = data.user || {};
      window.USER_ID = userObj.id || '';
      window.USER_NAME = userObj.name || '';
    } catch (e) {
      console.error('Failed to parse server data payload:', e);
    }
  }

  if (isCompleted) return;

  // Restore hydrated states into grid cells
  hydrateGrid();

  // Select first word by default
  const firstWordId = Object.keys(puzzleData.words || {})[0];
  if (firstWordId) {
    selectWord(firstWordId, 0);
  }
});

/**
 * Hydrates grid cell DOM elements with saved word state guesses
 */
function hydrateGrid() {
  Object.values(puzzleData.words || {}).forEach((word) => {
    const ws = wordStates[word.id];
    if (ws && ws.currentGuess) {
      word.cells.forEach((cellPos, idx) => {
        const char = ws.currentGuess[idx] || '';
        if (char) {
          const charSpan = document.getElementById(`char-${cellPos.row}-${cellPos.col}`);
          if (charSpan) {
            charSpan.textContent = char;
          }
        }
      });
    }
  });
}

/**
 * Handles user tap/click on a grid cell
 */
function handleCellClick(target, colParam) {
  let row, col;
  if (typeof target === 'object' && target !== null && target.dataset) {
    row = parseInt(target.dataset.row, 10);
    col = parseInt(target.dataset.col, 10);
  } else {
    row = target;
    col = colParam;
  }

  const cellKey = `${row}-${col}`;
  const cellData = puzzleData.cellMap ? puzzleData.cellMap[cellKey] : null;
  if (!cellData) return;

  const hasAcross = !!cellData.acrossWord;
  const hasDown = !!cellData.downWord;

  // If tapping an intersection cell
  if (hasAcross && hasDown) {
    // If cell is already active and direction can toggle, switch direction!
    if (activeCellRow === row && activeCellCol === col) {
      activeDirection = activeDirection === 'across' ? 'down' : 'across';
    } else {
      // Default to across unless current active direction is down and cell supports down
      if (activeDirection === 'down' && hasDown) {
        activeDirection = 'down';
      } else {
        activeDirection = 'across';
      }
    }

    // Apply pale cross-highlight to both horizontal and vertical words
    applyCrossHighlight(cellData.acrossWord, cellData.downWord);
  } else if (hasAcross) {
    activeDirection = 'across';
    clearCrossHighlights();
  } else if (hasDown) {
    activeDirection = 'down';
    clearCrossHighlights();
  }

  const chosenWordId = activeDirection === 'across' ? cellData.acrossWord : cellData.downWord;
  if (chosenWordId) {
    const wordDef = puzzleData.words[chosenWordId];
    const cellIdx = activeDirection === 'across' ? cellData.acrossIndex : cellData.downIndex;
    selectWord(chosenWordId, cellIdx);
  }
}

/**
 * Cross-Highlight Logic:
 * Highlights both horizontal and vertical words with pale background (.cross-highlight)
 */
function applyCrossHighlight(acrossWordId, downWordId) {
  clearCrossHighlights();

  const highlightCells = (wordId) => {
    if (!wordId || !puzzleData.words[wordId]) return;
    puzzleData.words[wordId].cells.forEach((c) => {
      const cellElem = document.getElementById(`cell-${c.row}-${c.col}`);
      if (cellElem) {
        cellElem.classList.add('cross-highlight');
      }
    });
  };

  highlightCells(acrossWordId);
  highlightCells(downWordId);
}

function clearCrossHighlights() {
  document.querySelectorAll('.cell.cross-highlight').forEach((el) => {
    el.classList.remove('cross-highlight');
  });
}

/**
 * Direction Lock & Word Focus Logic
 */
function selectWord(wordId, cellIndex = 0) {
  const wordDef = puzzleData.words[wordId];
  if (!wordDef) return;

  // If switching word, submit previous focus word time delta
  if (activeWordId && activeWordId !== wordId) {
    submitCurrentWord(activeWordId);
  }

  activeWordId = wordId;
  activeDirection = wordDef.direction;

  // Highlight active word cells
  document.querySelectorAll('.cell.active-word').forEach((el) => el.classList.remove('active-word'));
  wordDef.cells.forEach((c) => {
    const cellElem = document.getElementById(`cell-${c.row}-${c.col}`);
    if (cellElem) {
      cellElem.classList.add('active-word');
    }
  });

  // Set active cell position
  const targetCell = wordDef.cells[cellIndex] || wordDef.cells[0];
  setActiveCell(targetCell.row, targetCell.col);

  // Update Clue Bar
  updateClueDisplay(wordDef);

  // Fire /api/focus-word route to record focus timer start
  currentFocusStartTime = new Date().toISOString();
  fetch('/api/focus-word', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordId }),
  }).catch((err) => console.error('Focus word fetch error:', err));
}

/**
 * Sets active cell styling (.active-cell)
 */
function setActiveCell(row, col) {
  activeCellRow = row;
  activeCellCol = col;

  document.querySelectorAll('.cell.active-cell').forEach((el) => el.classList.remove('active-cell'));
  const cellElem = document.getElementById(`cell-${row}-${col}`);
  if (cellElem) {
    cellElem.classList.add('active-cell');
    cellElem.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }
}

/**
 * Updates Clue Bar in pure Hindi
 */
function updateClueDisplay(wordDef) {
  const clueTextEl = document.getElementById('clue-display-text');
  const dirBadgeEl = document.getElementById('dir-badge-display');

  if (clueTextEl && dirBadgeEl) {
    const dirHindi = wordDef.direction === 'across' ? 'बाएँ से दाएँ' : 'ऊपर से नीचे';
    dirBadgeEl.textContent = dirHindi;
    clueTextEl.textContent = `शब्द ${wordDef.num} (${wordDef.length} खाने)`;
  }
}

/**
 * Custom Hindi Keyboard Typing Logic:
 * Inserts syllable, advances focus, and auto-saves word state
 */
function handleKeyInput(syllable) {
  if (!activeWordId || activeCellRow === null || activeCellCol === null) return;

  const charSpan = document.getElementById(`char-${activeCellRow}-${activeCellCol}`);
  if (charSpan) {
    charSpan.textContent = syllable;
  }

  // Update internal word state guess array
  updateLocalWordState(activeWordId, activeCellRow, activeCellCol, syllable);

  // Auto-advance to next cell in locked direction
  advanceActiveCell(1);

  // Auto-save word state via API
  submitCurrentWord(activeWordId);
}

/**
 * Handles Backspace key (⌫ मिटाएँ)
 */
function handleBackspace() {
  if (!activeWordId || activeCellRow === null || activeCellCol === null) return;

  const charSpan = document.getElementById(`char-${activeCellRow}-${activeCellCol}`);
  if (charSpan && charSpan.textContent) {
    charSpan.textContent = '';
    updateLocalWordState(activeWordId, activeCellRow, activeCellCol, '');
  } else {
    // If current box was already empty, move to previous box and clear it
    advanceActiveCell(-1);
    const prevSpan = document.getElementById(`char-${activeCellRow}-${activeCellCol}`);
    if (prevSpan) {
      prevSpan.textContent = '';
      updateLocalWordState(activeWordId, activeCellRow, activeCellCol, '');
    }
  }

  submitCurrentWord(activeWordId);
}

/**
 * Handles Clear Word key (🧹 शब्द साफ़ करें)
 */
function handleClearWord() {
  if (!activeWordId) return;

  const wordDef = puzzleData.words[activeWordId];
  wordDef.cells.forEach((c) => {
    const charSpan = document.getElementById(`char-${c.row}-${c.col}`);
    if (charSpan) {
      charSpan.textContent = '';
    }
    updateLocalWordState(activeWordId, c.row, c.col, '');
  });

  // Move focus to first cell of word
  const firstCell = wordDef.cells[0];
  setActiveCell(firstCell.row, firstCell.col);

  submitCurrentWord(activeWordId);
}

/**
 * Handles Next Word key (➡️ अगला शब्द)
 */
function handleNextWord() {
  const wordKeys = Object.keys(puzzleData.words);
  const currentIndex = wordKeys.indexOf(activeWordId);
  const nextIndex = (currentIndex + 1) % wordKeys.length;
  selectWord(wordKeys[nextIndex], 0);
}

/**
 * Updates local Javascript guess state for both Across and Down words at cell (row, col)
 */
function updateLocalWordState(wordId, row, col, val) {
  const cellKey = `${row}-${col}`;
  const cellData = puzzleData.cellMap ? puzzleData.cellMap[cellKey] : null;
  if (!cellData) return;

  const updateWord = (wId, idx) => {
    if (!wId || idx === null || idx === undefined) return;
    const wDef = puzzleData.words[wId];
    if (!wDef) return;
    if (!wordStates[wId]) {
      wordStates[wId] = { wordId: wId, currentGuess: new Array(wDef.length).fill('') };
    }
    wordStates[wId].currentGuess[idx] = val;
  };

  updateWord(cellData.acrossWord, cellData.acrossIndex);
  updateWord(cellData.downWord, cellData.downIndex);
}

/**
 * Advances or retreats active cell in locked direction
 */
function advanceActiveCell(delta = 1) {
  if (!activeWordId) return;
  const wordDef = puzzleData.words[activeWordId];
  const currentIdx = wordDef.cells.findIndex((c) => c.row === activeCellRow && c.col === activeCellCol);

  if (currentIdx !== -1) {
    const newIdx = currentIdx + delta;
    if (newIdx >= 0 && newIdx < wordDef.length) {
      const nextCell = wordDef.cells[newIdx];
      setActiveCell(nextCell.row, nextCell.col);
    }
  }
}

/**
 * Submits word state updates to backend /api/submit-word for all affected words
 */
function submitCurrentWord(wordId) {
  if (!wordId) return;

  const cellKey = `${activeCellRow}-${activeCellCol}`;
  const cellData = puzzleData.cellMap ? puzzleData.cellMap[cellKey] : null;

  const wordsToSubmit = new Set();
  if (wordId) wordsToSubmit.add(wordId);
  if (cellData) {
    if (cellData.acrossWord) wordsToSubmit.add(cellData.acrossWord);
    if (cellData.downWord) wordsToSubmit.add(cellData.downWord);
  }

  wordsToSubmit.forEach((wId) => {
    if (!wordStates[wId]) return;
    const blurTime = new Date().toISOString();
    const startTime = currentFocusStartTime || blurTime;

    fetch('/api/submit-word', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordId: wId,
        currentGuess: wordStates[wId].currentGuess,
        startTime,
        blurTime,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          wordStates[wId].isCorrect = data.isCorrect;
        }
      })
      .catch((err) => console.error('Submit word error:', err));
  });
}

/* ==========================================================================
   Modals & Double-Confirmation Logic
   ========================================================================== */

function openRulesModal() {
  document.getElementById('rules-modal').classList.remove('hidden');
}

function closeRulesModal() {
  document.getElementById('rules-modal').classList.add('hidden');
}

/**
 * Double-Confirmation Flow for Final Submit
 */
function startFinalSubmitFlow() {
  const modal = document.getElementById('confirm-modal');
  const titleEl = document.getElementById('confirm-modal-title');
  const bodyEl = document.getElementById('confirm-modal-body');
  const actionsEl = document.getElementById('confirm-modal-actions');

  titleEl.textContent = 'अंतिम सबमिशन की पुष्टि (Confirmation 1/2)';
  bodyEl.innerHTML = '<p style="font-size: 16px; font-weight: 700;">क्या आप वाकई अपनी पहेली सबमिट करना चाहते हैं?</p>';

  actionsEl.innerHTML = `
    <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">रद्द करें</button>
    <button type="button" class="btn btn-primary" onclick="proceedToStep2Confirm()">हाँ, आगे बढ़ें</button>
  `;

  modal.classList.remove('hidden');
}

function proceedToStep2Confirm() {
  const titleEl = document.getElementById('confirm-modal-title');
  const bodyEl = document.getElementById('confirm-modal-body');
  const actionsEl = document.getElementById('confirm-modal-actions');

  titleEl.textContent = 'अंतिम चेतावनी (Confirmation 2/2)';
  bodyEl.innerHTML = `
    <p style="font-size: 15px; color: #d32f2f; font-weight: 700; margin-bottom: 8px;">
      ध्यान दें! सबमिट करने के बाद आप कोई उत्तर बदल नहीं पाएंगे।
    </p>
    <p style="font-size: 16px; font-weight: 800;">
      क्या आप पूरी तरह निश्चित हैं?
    </p>
  `;

  actionsEl.innerHTML = `
    <button type="button" class="btn btn-secondary" onclick="closeConfirmModal()">वापस जाएँ</button>
    <button type="button" class="btn btn-danger" onclick="executeFinalSubmit()">हाँ, सबमिट करें</button>
  `;
}

function closeConfirmModal() {
  document.getElementById('confirm-modal').classList.add('hidden');
}

/**
 * Synchronizes all visible grid cell DOM characters directly into wordStates object
 */
function syncDOMToWordStates() {
  if (!puzzleData.cellMap) return;

  Object.keys(puzzleData.cellMap).forEach((cellKey) => {
    const cellData = puzzleData.cellMap[cellKey];
    const charSpan = document.getElementById(`char-${cellData.row}-${cellData.col}`);
    const charVal = charSpan ? charSpan.textContent.trim() : '';

    if (cellData.acrossWord) {
      const wDef = puzzleData.words[cellData.acrossWord];
      if (wDef) {
        if (!wordStates[cellData.acrossWord]) {
          wordStates[cellData.acrossWord] = { wordId: cellData.acrossWord, currentGuess: new Array(wDef.length).fill('') };
        }
        wordStates[cellData.acrossWord].currentGuess[cellData.acrossIndex] = charVal;
      }
    }

    if (cellData.downWord) {
      const wDef = puzzleData.words[cellData.downWord];
      if (wDef) {
        if (!wordStates[cellData.downWord]) {
          wordStates[cellData.downWord] = { wordId: cellData.downWord, currentGuess: new Array(wDef.length).fill('') };
        }
        wordStates[cellData.downWord].currentGuess[cellData.downIndex] = charVal;
      }
    }
  });
}

/**
 * Fires /api/final-submit route and redirects to /leaderboard page
 */
function executeFinalSubmit() {
  closeConfirmModal();

  // Sync DOM cell state to ensure last-typed characters are included
  syncDOMToWordStates();

  fetch('/api/final-submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ wordStates }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        window.location.replace('/leaderboard');
      }
    })
    .catch((err) => console.error('Final submit error:', err));
}
