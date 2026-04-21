
import fs from 'fs';
const content = fs.readFileSync('c:\\Code\\EnProceso\\MES.System.MG\\src\\pages\\ConversorPage.tsx', 'utf8');
let openBraces = 0;
let openParens = 0;
for (let i = 0; i < content.length; i++) {
  if (content[i] === '{') openBraces++;
  if (content[i] === '}') openBraces--;
  if (content[i] === '(') openParens++;
  if (content[i] === ')') openParens--;
}
console.log('Open Braces:', openBraces);
console.log('Open Parens:', openParens);
