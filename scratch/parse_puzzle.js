import fs from 'fs';

const html = fs.readFileSync('c:/Users/stres/Desktop/hindi/hindi-crossword.html', 'utf8');

const rows = html.split('<div class="row">').slice(1);
const cellMap = {};

rows.forEach((rowStr, r) => {
  const rowClean = rowStr.split('</div>\n</div>')[0];
  const items = rowClean.split(/<div class="(cell|blk)">/);

  let c = 0;
  for (let i = 1; i < items.length; i += 2) {
    const type = items[i];
    const content = items[i + 1].split('</div>')[0];

    if (type === 'cell') {
      const numMatch = content.match(/<i>(\d+)<\/i>/);
      const charMatch = content.match(/<b>(.*?)<\/b>/);
      const num = numMatch ? parseInt(numMatch[1], 10) : null;
      const char = charMatch ? charMatch[1] : '';

      cellMap[`${r}-${c}`] = { row: r, col: c, num, char };
    }
    c++;
  }
});

console.log(`Parsed ${Object.keys(cellMap).length} active grid cells over ${rows.length} rows.`);

// Parse Across & Down Clues
const acrossList = [];
const downList = [];

const liRegex = /<li><span class="n">(\d+)<\/span><span class="q">(.*?)<\/span><span class="len">\((.*?) खाने\)<\/span><span class="ans">(.*?)<\/span><\/li>/g;

const parts = html.split('क्षैतिज');
const acrossBlock = parts[1].split('ऊर्ध्व')[0];
const downBlock = parts[1].split('ऊर्ध्व')[1];

let match;
while ((match = liRegex.exec(acrossBlock)) !== null) {
  acrossList.push({ num: parseInt(match[1]), clue: match[2], length: parseInt(match[3]), answer: match[4] });
}

liRegex.lastIndex = 0;
while ((match = liRegex.exec(downBlock)) !== null) {
  downList.push({ num: parseInt(match[1]), clue: match[2], length: parseInt(match[3]), answer: match[4] });
}

console.log(`Across words: ${acrossList.length}, Down words: ${downList.length}`);

fs.writeFileSync('c:/Users/stres/Desktop/hindi/scratch/parsed_puzzle.json', JSON.stringify({ cellMap, acrossList, downList }, null, 2));
