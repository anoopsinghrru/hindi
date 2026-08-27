import fs from 'fs';

const fullPuzzleData = JSON.parse(fs.readFileSync('c:/Users/stres/Desktop/hindi/scratch/full_puzzle.json', 'utf8'));

const code = `/**
 * Pre-calculated 24x18 Hindi Crossword Puzzle Data
 * Total Words: 37 (18 Across, 19 Down)
 * Total Active Grid Cells: 87
 */
export const puzzleData = ${JSON.stringify(fullPuzzleData, null, 2)};
`;

fs.writeFileSync('c:/Users/stres/Desktop/hindi/src/config/puzzleData.js', code);
console.log('Created src/config/puzzleData.js successfully');
