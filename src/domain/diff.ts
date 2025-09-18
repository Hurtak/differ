import * as diff from "diff";

// Types
export type DiffConfig = {
  mode: "text" | "csv";
  hideUnchangedRows: boolean;
  beforeAfterColumn: boolean;
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
  lineNumber: number;
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
  return text.split("\n");
};

export const computeWordChanges = (before: string, after: string): WordChange[] => {
  return diff.diffWords(before, after);
};

export const createDiffLines = (
  beforeLines: Lines,
  afterLines: Lines,
  config: DiffConfig,
): DiffLine[] => {
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const diffLines: DiffLine[] = [];

  for (let i = 0; i < maxLines; i++) {
    const beforeLine = beforeLines[i] || "";
    const afterLine = afterLines[i] || "";

    if (beforeLine === afterLine) {
      if (!config.hideUnchangedRows) {
        diffLines.push({
          type: "unchanged",
          content: beforeLine,
          lineNumber: i + 1,
        });
      }
    } else {
      // Lines are different - create word-level diffs
      const wordChanges = computeWordChanges(beforeLine, afterLine);

      if (beforeLine) {
        diffLines.push({
          type: "removed",
          content: beforeLine,
          lineNumber: i + 1,
          wordChanges,
        });
      }

      if (afterLine) {
        diffLines.push({
          type: "added",
          content: afterLine,
          lineNumber: i + 1,
          wordChanges,
        });
      }
    }
  }

  return diffLines;
};

// CSV diff pipeline
export const parseCsvToRows = (text: string): CSVRow[] => {
  return text.split("\n").map((line) => line.split(","));
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
      before: beforeCell,
      after: afterCell,
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
        rowNumber: i + 1,
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

export const generateCsvHeaders = (
  maxCols: number,
  changedColumns: Set<number>,
  config: DiffConfig,
): string[] => {
  const headers: string[] = [];

  for (let j = 0; j < maxCols; j++) {
    if (config.beforeAfterColumn && changedColumns.has(j)) {
      headers.push(`Column ${j + 1}`);
      headers.push(`Column ${j + 1} Before`);
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
  const diffRows = createDiffRows(beforeRows, afterRows, config);

  const maxCols = Math.max(
    ...beforeRows.map((row) => row.length),
    ...afterRows.map((row) => row.length),
  );

  const changedColumns = config.beforeAfterColumn ? detectChangedColumns(diffRows) : new Set<number>();
  const headers = generateCsvHeaders(maxCols, changedColumns, config);

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
