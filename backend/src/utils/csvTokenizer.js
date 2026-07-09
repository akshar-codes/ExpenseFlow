const stripBom = (text) =>
  text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

export const parseCSV = (text) => {
  const input = stripBom(String(text ?? ""));
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const len = input.length;

  const pushField = () => {
    row.push(field);
    field = "";
  };

  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < len) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += char;
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (char === ",") {
      pushField();
      i += 1;
      continue;
    }

    if (char === "\r") {
      if (input[i + 1] === "\n") i += 1;
      pushRow();
      i += 1;
      continue;
    }

    if (char === "\n") {
      pushRow();
      i += 1;
      continue;
    }

    field += char;
    i += 1;
  }

  // Flush the final field/row for files without a trailing newline.
  if (field.length > 0 || row.length > 0) {
    pushRow();
  }

  // Drop fully-blank trailing rows produced by a trailing newline.
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
};

export const parseCSVToObjects = (text) => {
  const rows = parseCSV(text);

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = rows[0].map((h) => h.trim());

  const dataRows = rows.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (r[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers, rows: dataRows };
};
