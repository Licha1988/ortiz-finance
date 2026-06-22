import { readFileSync } from "node:fs";
import XLSX from "xlsx";

const buf = readFileSync(
  process.argv[2] ?? "C:/Users/Lisandro/OneDrive/Escritorio/Ortiz cashflow Diego.xlsx",
);
const wb = XLSX.read(buf);
const sheet = wb.Sheets["EERR Mensual"];

for (let c = 0; c <= 35; c++) {
  const v = sheet[XLSX.utils.encode_cell({ r: 2, c })]?.v;
  if (v) console.log(c, XLSX.utils.encode_col(c), v);
}

console.log("--- sample rows ---");
for (const r of [3, 4, 5, 6, 7, 20, 21, 22, 33, 43]) {
  const label = sheet[XLSX.utils.encode_cell({ r, c: 5 })]?.v ?? sheet[XLSX.utils.encode_cell({ r, c: 6 })]?.v;
  const y1Total = sheet[XLSX.utils.encode_cell({ r, c: 20 })]?.v;
  const y1Year = sheet[XLSX.utils.encode_cell({ r, c: 21 })]?.v;
  const y2Year = sheet[XLSX.utils.encode_cell({ r, c: 22 })]?.v;
  const y2m0 = sheet[XLSX.utils.encode_cell({ r, c: 23 })]?.v;
  console.log("row", r, label, "U", y1Total, "V", y1Year, "W", y2Year, "X", y2m0);
}
