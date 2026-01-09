import * as diff from "diff";

// Types
export type DiffConfig = {
  mode: "text" | "csv";
  hideUnchangedRows: boolean;
  beforeAfterColumn: boolean;
  firstRowIsHeader: boolean;
};

export type Lines = string[];

export type WordChange = {
  value: string;
  added?: boolean;
  removed?: boolean;
};

export type DiffLine = {
  type: "added" | "removed" | "unchanged";
  content: string;
  beforeLineNumber?: number;
  afterLineNumber?: number;
  wordChanges?: WordChange[];
};

export type CSVRow = string[];

export type DiffCell = {
  before: string;
  after: string;
  hasChange: boolean;
  wordChanges: WordChange[];
};

export type DiffTable = {
  headers: string[];
  rows: DiffRow[];
};

export type DiffRow = {
  rowNumber: number;
  cells: DiffCell[];
  hasChanges: boolean;
};

// Text diff pipeline
export const parseTextToLines = (text: string): Lines => {
  return text.split(/\n/);
};

export const computeWordChanges = (before: string, after: string): WordChange[] => {
  return diff.diffWords(before, after);
};

export const createDiffLines = (
  beforeLines: Lines,
  afterLines: Lines,
  config: DiffConfig,
): DiffLine[] => {
  const diffLines: DiffLine[] = [];

  // Use diff.diffArrays for proper LCS-based line diffing
  const changes = diff.diffArrays(beforeLines, afterLines);

  let beforeLineNumber = 1;
  let afterLineNumber = 1;

  for (let i = 0; i < changes.length; i++) {
    const change = changes[i];
    const nextChange = changes[i + 1];

    if (change.removed && nextChange && nextChange.added) {
      // This is a modification (removal followed by addition)
      // Pair up lines to compute word-level diffs
      const removedLines = change.value;
      const addedLines = nextChange.value;
      const maxPairs = Math.max(removedLines.length, addedLines.length);

      for (let j = 0; j < maxPairs; j++) {
        const beforeLine = removedLines[j] || "";
        const afterLine = addedLines[j] || "";
        const wordChanges = computeWordChanges(beforeLine, afterLine);

        if (beforeLine) {
          diffLines.push({
            type: "removed",
            content: beforeLine,
            beforeLineNumber: beforeLineNumber++,
            wordChanges,
          });
        }

        if (afterLine) {
          diffLines.push({
            type: "added",
            content: afterLine,
            afterLineNumber: afterLineNumber++,
            wordChanges,
          });
        }
      }

      // Skip the next change since we processed it as part of this pair
      i++;
    } else if (change.removed) {
      // Pure removal (not followed by addition)
      for (const line of change.value) {
        diffLines.push({
          type: "removed",
          content: line,
          beforeLineNumber: beforeLineNumber++,
        });
      }
    } else if (change.added) {
      // Pure addition (not part of a modification pair)
      for (const line of change.value) {
        diffLines.push({
          type: "added",
          content: line,
          afterLineNumber: afterLineNumber++,
        });
      }
    } else {
      // Line is unchanged
      for (const line of change.value) {
        if (!config.hideUnchangedRows) {
          diffLines.push({
            type: "unchanged",
            content: line,
            beforeLineNumber: beforeLineNumber++,
            afterLineNumber: afterLineNumber++,
          });
        } else {
          beforeLineNumber++;
          afterLineNumber++;
        }
      }
    }
  }

  return diffLines;
};

// CSV diff pipeline
export const parseCsvToRows = (text: string): CSVRow[] => {
  return text.split("\n").map((line) => parseCsvLine(line));
};

// Parse a single CSV line, handling quoted fields properly
export const parseCsvLine = (line: string): string[] => {
  if (line.at(-1) === "\r") {
    line = line.slice(0, -1);
  }
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote within quoted field - add single quote and skip next
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state (but don't add the quote to current)
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // Field separator outside quotes
      result.push(current);
      current = "";
    } else {
      current += char;
    }

    i++;
  }

  // Add the last field
  result.push(current);

  return result;
};

// Strip quotes that were added for CSV formatting (not content)
export const stripCsvFormattingQuotes = (field: string): string => {
  // If field is wrapped in quotes and doesn't contain special CSV characters,
  // the quotes are likely for formatting and should be removed
  if (field.startsWith('"') && field.endsWith('"')) {
    const inner = field.slice(1, -1);
    // Check if inner content contains characters that would require quoting
    if (!inner.includes(",") && !inner.includes("\n") && !inner.includes('"')) {
      return inner;
    }
  }
  return field;
};

export const computeCellWordChanges = (beforeCell: string, afterCell: string): WordChange[] => {
  const before = beforeCell || "";
  const after = afterCell || "";

  return diff.diffWords(before, after);
};

export const createDiffCells = (
  beforeRow: CSVRow,
  afterRow: CSVRow,
): DiffCell[] => {
  const maxCells = Math.max(beforeRow.length, afterRow.length);
  const diffCells: DiffCell[] = [];

  for (let j = 0; j < maxCells; j++) {
    const beforeCell = beforeRow[j] || "";
    const afterCell = afterRow[j] || "";
    const hasChange = beforeCell !== afterCell;
    const wordChanges = hasChange ? computeCellWordChanges(beforeCell, afterCell) : [];

    diffCells.push({
      before: stripCsvFormattingQuotes(beforeCell),
      after: stripCsvFormattingQuotes(afterCell),
      hasChange,
      wordChanges,
    });
  }

  return diffCells;
};

export const createDiffRows = (
  beforeRows: CSVRow[],
  afterRows: CSVRow[],
  config: DiffConfig,
): DiffRow[] => {
  return createDiffRowsWithOffset(beforeRows, afterRows, config);
};

export const createDiffRowsWithOffset = (
  beforeRows: CSVRow[],
  afterRows: CSVRow[],
  config: DiffConfig,
  rowOffset: number = 0,
): DiffRow[] => {
  const maxRows = Math.max(beforeRows.length, afterRows.length);
  const diffRows: DiffRow[] = [];

  for (let i = 0; i < maxRows; i++) {
    const beforeRow = beforeRows[i] || [];
    const afterRow = afterRows[i] || [];

    if (!beforeRow.length && !afterRow.length) continue;

    const cells = createDiffCells(beforeRow, afterRow);
    const hasChanges = cells.some((cell) => cell.hasChange);

    if (!config.hideUnchangedRows || hasChanges) {
      diffRows.push({
        rowNumber: i + 1 + rowOffset,
        cells,
        hasChanges,
      });
    }
  }

  return diffRows;
};

export const detectChangedColumns = (diffRows: DiffRow[]): Set<number> => {
  const changedColumns = new Set<number>();

  diffRows.forEach((row) => {
    row.cells.forEach((cell, colIndex) => {
      if (cell.hasChange) {
        changedColumns.add(colIndex);
      }
    });
  });

  return changedColumns;
};

export const extractCsvHeaders = (
  beforeRows: CSVRow[],
  afterRows: CSVRow[],
): string[] => {
  // Try to get headers from afterRows first, then beforeRows
  const headerSource = afterRows.length > 0 ? afterRows[0] : beforeRows[0];
  return headerSource ? headerSource.map(stripCsvFormattingQuotes) : [];
};

export const generateCSVHeadersWithBeforeAfter = (
  actualHeaders: string[],
  changedColumns: Set<number>,
): string[] => {
  const headers: string[] = [];

  for (let j = 0; j < actualHeaders.length; j++) {
    if (changedColumns.has(j)) {
      headers.push(`${actualHeaders[j].trim()} Before`);
      headers.push(`${actualHeaders[j].trim()} After`);
    } else {
      headers.push(actualHeaders[j]);
    }
  }

  return headers;
};

export const generateCsvHeaders = (
  maxCols: number,
  changedColumns: Set<number>,
  config: DiffConfig,
): string[] => {
  const headers: string[] = [];

  for (let j = 0; j < maxCols; j++) {
    if (config.beforeAfterColumn && changedColumns.has(j)) {
      headers.push(`Column ${j + 1} Before`);
      headers.push(`Column ${j + 1} After`);
    } else {
      headers.push(`Column ${j + 1}`);
    }
  }

  return headers;
};

export const createCsvDiffTable = (
  beforeText: string,
  afterText: string,
  config: DiffConfig,
): DiffTable => {
  const beforeRows = parseCsvToRows(beforeText);
  const afterRows = parseCsvToRows(afterText);

  let dataBeforeRows = beforeRows;
  let dataAfterRows = afterRows;
  let headers: string[];
  let actualHeaders: string[] = [];

  if (config.firstRowIsHeader && beforeRows.length > 0 && afterRows.length > 0) {
    // First row is header - extract headers and skip first row for data processing
    actualHeaders = extractCsvHeaders(beforeRows, afterRows);

    if (beforeRows.length > 1) {
      dataBeforeRows = beforeRows.slice(1);
    }

    if (afterRows.length > 1) {
      dataAfterRows = afterRows.slice(1);
    }
  } else {
    // No header row - treat all rows as data
    actualHeaders = [];
  }

  const diffRows = createDiffRowsWithOffset(dataBeforeRows, dataAfterRows, config, config.firstRowIsHeader ? 1 : 0);

  const _maxCols = Math.max(
    ...dataBeforeRows.map((row) => row.length),
    ...dataAfterRows.map((row) => row.length),
  );

  const changedColumns = config.beforeAfterColumn ? detectChangedColumns(diffRows) : new Set<number>();

  if (!config.firstRowIsHeader) {
    // First row is NOT header - generate generic headers based on column count
    headers = config.beforeAfterColumn
      ? generateCsvHeaders(_maxCols, changedColumns, config)
      : generateCsvHeaders(_maxCols, new Set<number>(), config);
  } else {
    // First row IS header - use actual headers from the data
    headers = config.beforeAfterColumn
      ? generateCSVHeadersWithBeforeAfter(actualHeaders, changedColumns)
      : actualHeaders;
  }

  return {
    headers,
    rows: diffRows,
  };
};

// Main pipeline functions
export const computeTextDiff = (
  beforeText: string,
  afterText: string,
  config: DiffConfig,
): DiffLine[] => {
  const beforeLines = parseTextToLines(beforeText);
  const afterLines = parseTextToLines(afterText);
  return createDiffLines(beforeLines, afterLines, config);
};

export const computeCsvDiff = (
  beforeText: string,
  afterText: string,
  config: DiffConfig,
): DiffTable => {
  return createCsvDiffTable(beforeText, afterText, config);
};

// Export functions for downloading
export const exportDiffTableToCsv = (diffTable: DiffTable, config: DiffConfig): string => {
  const lines: string[] = [];

  // Add headers
  if (diffTable.headers.length > 0) {
    lines.push(diffTable.headers.map(encodeCSVField).join(","));
  }

  // Determine which columns have changes for before/after mode
  const changedColumns = config.beforeAfterColumn ? detectChangedColumns(diffTable.rows) : new Set<number>();

  // Add data rows
  diffTable.rows.forEach((row) => {
    const rowData: string[] = [];

    // Add cell data (no row number column as requested)
    row.cells.forEach((cell, cellIndex) => {
      if (config.beforeAfterColumn && changedColumns.has(cellIndex)) {
        // In before/after mode for changed columns, show both before and after
        rowData.push(encodeCSVField(cell.before)); // Before value
        rowData.push(encodeCSVField(cell.after)); // After value
      } else {
        // Normal mode or unchanged column - show the after value
        rowData.push(encodeCSVField(cell.after));
      }
    });

    lines.push(rowData.join(","));
  });

  return lines.join("\n");
};

// Helper function to escape CSV fields
const encodeCSVField = (field: string): string => {
  // Always quote fields and escape internal quotes by doubling them
  return `"${field.replaceAll(`"`, `""`)}"`;
};
