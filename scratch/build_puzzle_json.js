import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('c:/Users/stres/Desktop/hindi/scratch/parsed_puzzle.json', 'utf8'));
const cellMap = raw.cellMap; // key: "r-c" => { row, col, num, char }

// Map from number to cell position
const numCellMap = {};
Object.values(cellMap).forEach(cell => {
  if (cell.num) {
    numCellMap[cell.num] = cell;
  }
});

// Helper to convert Hindi string into characters/syllables array
// e.g., "अनुराग" => ["अ", "नु", "रा", "ग"]
// Let's trace cells in grid to get exact character per cell
const words = {};

// Process Across words
raw.acrossList.forEach(item => {
  const startCell = numCellMap[item.num];
  if (!startCell) {
    console.error(`Across start cell not found for num ${item.num}`);
    return;
  }

  const r = startCell.row;
  const c = startCell.col;
  const cells = [];
  const chars = [];

  for (let i = 0; i < item.length; i++) {
    const key = `${r}-${c + i}`;
    const cell = cellMap[key];
    if (!cell) {
      console.error(`Across cell missing at ${r}-${c + i} for word ${item.num}`);
    } else {
      cells.push({ row: r, col: c + i, index: i });
      chars.push(cell.char);
    }
  }

  const wordId = `across-${item.num}`;
  words[wordId] = {
    id: wordId,
    num: item.num,
    direction: 'across',
    clue: item.clue,
    length: item.length,
    answerStr: item.answer,
    chars: chars,
    cells: cells
  };
});

// Process Down words
raw.downList.forEach(item => {
  const startCell = numCellMap[item.num];
  if (!startCell) {
    console.error(`Down start cell not found for num ${item.num}`);
    return;
  }

  const r = startCell.row;
  const c = startCell.col;
  const cells = [];
  const chars = [];

  for (let i = 0; i < item.length; i++) {
    const key = `${r + i}-${c}`;
    const cell = cellMap[key];
    if (!cell) {
      console.error(`Down cell missing at ${r + i}-${c} for word ${item.num}`);
    } else {
      cells.push({ row: r + i, col: c, index: i });
      chars.push(cell.char);
    }
  }

  const wordId = `down-${item.num}`;
  words[wordId] = {
    id: wordId,
    num: item.num,
    direction: 'down',
    clue: item.clue,
    length: item.length,
    answerStr: item.answer,
    chars: chars,
    cells: cells
  };
});

// Attach across/down word attributes to each cell
Object.keys(cellMap).forEach(key => {
  cellMap[key].acrossWord = null;
  cellMap[key].acrossIndex = null;
  cellMap[key].downWord = null;
  cellMap[key].downIndex = null;
});

Object.values(words).forEach(word => {
  word.cells.forEach(cellPos => {
    const key = `${cellPos.row}-${cellPos.col}`;
    if (cellMap[key]) {
      if (word.direction === 'across') {
        cellMap[key].acrossWord = word.id;
        cellMap[key].acrossIndex = cellPos.index;
      } else {
        cellMap[key].downWord = word.id;
        cellMap[key].downIndex = cellPos.index;
      }
    }
  });
});

// Collect all unique characters used in puzzle answers to build the keyboard syllables
const puzzleSyllablesSet = new Set();
Object.values(words).forEach(word => {
  word.chars.forEach(ch => {
    if (ch) puzzleSyllablesSet.add(ch);
  });
});
const puzzleSyllables = Array.from(puzzleSyllablesSet);

// Random Hindi decoy syllables (10-15 decoys)
const decoySyllables = ['खू', 'ध्रु', 'टौ', 'ज्ञं', 'प्स', 'श्व', 'द्वो', 'स्त्र', 'झि', 'ढु', 'प्र', 'त्कृ', 'न्मा', 'द्भ'];

console.log(`Total words built: ${Object.keys(words).length}`);
console.log(`Total unique Hindi syllables in puzzle: ${puzzleSyllables.length}`);
console.log(`Puzzle Syllables:`, puzzleSyllables);

const fullPuzzleData = {
  gridDimensions: { rows: 24, cols: 18 },
  cellMap,
  words,
  puzzleSyllables,
  decoySyllables
};

fs.writeFileSync('c:/Users/stres/Desktop/hindi/scratch/full_puzzle.json', JSON.stringify(fullPuzzleData, null, 2));
