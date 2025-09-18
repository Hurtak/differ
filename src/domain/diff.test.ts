import { assertEquals } from "@std/assert";
import { describe, test } from "@std/testing/bdd";
import {
  computeCellWordChanges,
  computeCsvDiff,
  computeTextDiff,
  computeWordChanges,
  createCsvDiffTable,
  createDiffCells,
  createDiffLines,
  createDiffRows,
  detectChangedColumns,
  DiffConfig,
  generateCsvHeaders,
  parseCsvToRows,
  parseTextToLines,
} from "../domain/diff.ts";

describe("parseTextToLines", () => {
  test("splits text by newlines", () => {
    const input = "line1\nline2\nline3";
    const expected = ["line1", "line2", "line3"];
    assertEquals(parseTextToLines(input), expected);
  });

  test("handles empty string", () => {
    assertEquals(parseTextToLines(""), [""]);
  });

  test("handles single line without newline", () => {
    assertEquals(parseTextToLines("single line"), ["single line"]);
  });

  test("handles multiple consecutive newlines", () => {
    const input = "line1\n\nline3";
    const expected = ["line1", "", "line3"];
    assertEquals(parseTextToLines(input), expected);
  });
});

describe("computeWordChanges", () => {
  test("detects added words", () => {
    const before = "hello";
    const after = "hello world";
    const changes = computeWordChanges(before, after);
    assertEquals(changes.length, 2);
    assertEquals(changes[0].value, "hello ");
    assertEquals(changes[0].added, false);
    assertEquals(changes[0].removed, false);
    assertEquals(changes[1].value, "world");
    assertEquals(changes[1].added, true);
  });

  test("detects removed words", () => {
    const before = "hello world";
    const after = "hello";
    const changes = computeWordChanges(before, after);
    assertEquals(changes.length, 2);
    assertEquals(changes[0].value, "hello");
    assertEquals(changes[0].added, false);
    assertEquals(changes[0].removed, false);
    assertEquals(changes[1].value, " world");
    assertEquals(changes[1].removed, true);
  });

  test("detects modified words", () => {
    const before = "hello";
    const after = "hi";
    const changes = computeWordChanges(before, after);
    assertEquals(changes.length, 2);
    assertEquals(changes[0].value, "hello");
    assertEquals(changes[0].removed, true);
    assertEquals(changes[1].value, "hi");
    assertEquals(changes[1].added, true);
  });

  test("handles identical strings", () => {
    const before = "hello";
    const after = "hello";
    const changes = computeWordChanges(before, after);
    assertEquals(changes.length, 1);
    assertEquals(changes[0].value, "hello");
    assertEquals(changes[0].added, false);
    assertEquals(changes[0].removed, false);
  });
});

describe("createDiffLines", () => {
  test("creates diff lines for identical content", () => {
    const beforeLines = ["line1", "line2"];
    const afterLines = ["line1", "line2"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2);
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[0].content, "line1");
    assertEquals(diffLines[0].lineNumber, 1);
    assertEquals(diffLines[1].type, "unchanged");
    assertEquals(diffLines[1].content, "line2");
    assertEquals(diffLines[1].lineNumber, 2);
  });

  test("creates diff lines for added content", () => {
    const beforeLines = ["line1"];
    const afterLines = ["line1", "line2"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2);
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[1].type, "added");
    assertEquals(diffLines[1].content, "line2");
  });

  test("creates diff lines for removed content", () => {
    const beforeLines = ["line1", "line2"];
    const afterLines = ["line1"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2);
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[1].type, "removed");
    assertEquals(diffLines[1].content, "line2");
  });

  test("creates diff lines with word changes", () => {
    const beforeLines = ["hello world"];
    const afterLines = ["hi world"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2);
    assertEquals(diffLines[0].type, "removed");
    assertEquals(diffLines[0].wordChanges!.length, 3);
    assertEquals(diffLines[1].type, "added");
    assertEquals(diffLines[1].wordChanges!.length, 3);
  });

  test("hides unchanged rows when configured", () => {
    const beforeLines = ["line1", "line2", "line3"];
    const afterLines = ["line1", "changed", "line3"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: true,
      beforeAfterColumn: false,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2); // Only the changed line
    assertEquals(diffLines[0].type, "removed");
    assertEquals(diffLines[1].type, "added");
  });
});

describe("parseCsvToRows", () => {
  test("parses CSV with multiple rows and columns", () => {
    const input = "a,b,c\n1,2,3\nx,y,z";
    const expected = [
      ["a", "b", "c"],
      ["1", "2", "3"],
      ["x", "y", "z"],
    ];
    assertEquals(parseCsvToRows(input), expected);
  });

  test("handles empty cells", () => {
    const input = "a,,c\n,2,";
    const expected = [
      ["a", "", "c"],
      ["", "2", ""],
    ];
    assertEquals(parseCsvToRows(input), expected);
  });

  test("handles single row", () => {
    const input = "a,b,c";
    const expected = [["a", "b", "c"]];
    assertEquals(parseCsvToRows(input), expected);
  });
});

describe("computeCellWordChanges", () => {
  test("computes word changes for cell content", () => {
    const before = "old";
    const after = "new";
    const changes = computeCellWordChanges(before, after);

    assertEquals(changes.length, 2);
    assertEquals(changes[0].value, "old");
    assertEquals(changes[0].removed, true);
    assertEquals(changes[1].value, "new");
    assertEquals(changes[1].added, true);
  });

  test("handles empty cells", () => {
    const changes = computeCellWordChanges("", "new");
    assertEquals(changes[0].value, "new");
    assertEquals(changes[0].added, true);
  });
});

describe("createDiffCells", () => {
  test("creates diff cells for identical rows", () => {
    const beforeRow = ["a", "b", "c"];
    const afterRow = ["a", "b", "c"];
    const diffCells = createDiffCells(beforeRow, afterRow);

    assertEquals(diffCells.length, 3);
    assertEquals(diffCells[0].hasChange, false);
    assertEquals(diffCells[0].before, "a");
    assertEquals(diffCells[0].after, "a");
  });

  test("creates diff cells with changes", () => {
    const beforeRow = ["a", "b", "c"];
    const afterRow = ["a", "changed", "c"];
    const diffCells = createDiffCells(beforeRow, afterRow);

    assertEquals(diffCells[1].hasChange, true);
    assertEquals(diffCells[1].before, "b");
    assertEquals(diffCells[1].after, "changed");
    assertEquals(diffCells[1].wordChanges.length > 0, true);
  });

  test("handles rows with different lengths", () => {
    const beforeRow = ["a", "b"];
    const afterRow = ["a", "b", "c"];
    const diffCells = createDiffCells(beforeRow, afterRow);

    assertEquals(diffCells.length, 3);
    assertEquals(diffCells[2].before, "");
    assertEquals(diffCells[2].after, "c");
    assertEquals(diffCells[2].hasChange, true);
  });
});

describe("createDiffRows", () => {
  test("creates diff rows for identical CSV data", () => {
    const beforeRows = [["a", "b"], ["1", "2"]];
    const afterRows = [["a", "b"], ["1", "2"]];
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffRows = createDiffRows(beforeRows, afterRows, config);

    assertEquals(diffRows.length, 2);
    assertEquals(diffRows[0].hasChanges, false);
    assertEquals(diffRows[0].rowNumber, 1);
  });

  test("creates diff rows with changes", () => {
    const beforeRows = [["a", "b"], ["1", "2"]];
    const afterRows = [["a", "b"], ["1", "changed"]];
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffRows = createDiffRows(beforeRows, afterRows, config);

    assertEquals(diffRows.length, 2);
    assertEquals(diffRows[1].hasChanges, true);
    assertEquals(diffRows[1].cells[1].hasChange, true);
  });

  test("hides unchanged rows when configured", () => {
    const beforeRows = [["a", "b"], ["1", "2"], ["x", "y"]];
    const afterRows = [["a", "b"], ["1", "changed"], ["x", "y"]];
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: true,
      beforeAfterColumn: false,
    };
    const diffRows = createDiffRows(beforeRows, afterRows, config);

    assertEquals(diffRows.length, 1); // Only the changed row
    assertEquals(diffRows[0].rowNumber, 2);
  });
});

describe("detectChangedColumns", () => {
  test("detects columns with changes", () => {
    const diffRows = [
      {
        rowNumber: 1,
        hasChanges: true,
        cells: [
          { before: "a", after: "a", hasChange: false, wordChanges: [] },
          { before: "b", after: "changed", hasChange: true, wordChanges: [] },
        ],
      },
    ];
    const changedColumns = detectChangedColumns(diffRows);
    assertEquals(changedColumns.has(0), false);
    assertEquals(changedColumns.has(1), true);
  });

  test("returns empty set for no changes", () => {
    const diffRows = [
      {
        rowNumber: 1,
        hasChanges: false,
        cells: [
          { before: "a", after: "a", hasChange: false, wordChanges: [] },
          { before: "b", after: "b", hasChange: false, wordChanges: [] },
        ],
      },
    ];
    const changedColumns = detectChangedColumns(diffRows);
    assertEquals(changedColumns.size, 0);
  });
});

describe("generateCsvHeaders", () => {
  test("generates headers for normal mode", () => {
    const changedColumns = new Set<number>();
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const headers = generateCsvHeaders(3, changedColumns, config);

    assertEquals(headers, ["Column 1", "Column 2", "Column 3"]);
  });

  test("generates headers for before/after column mode", () => {
    const changedColumns = new Set([1]); // Column 1 has changes
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: true,
    };
    const headers = generateCsvHeaders(3, changedColumns, config);

    assertEquals(headers, ["Column 1", "Column 2", "Column 2 Before", "Column 3"]);
  });
});

describe("createCsvDiffTable", () => {
  test("creates diff table for identical CSV", () => {
    const beforeText = "a,b\n1,2";
    const afterText = "a,b\n1,2";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffTable = createCsvDiffTable(beforeText, afterText, config);

    assertEquals(diffTable.headers, ["Column 1", "Column 2"]);
    assertEquals(diffTable.rows.length, 2);
    assertEquals(diffTable.rows[0].hasChanges, false);
  });

  test("creates diff table with changes", () => {
    const beforeText = "a,b\n1,2";
    const afterText = "a,b\n1,changed";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffTable = createCsvDiffTable(beforeText, afterText, config);

    assertEquals(diffTable.rows[1].hasChanges, true);
    assertEquals(diffTable.rows[1].cells[1].hasChange, true);
  });
});

describe("computeTextDiff", () => {
  test("computes text diff pipeline end-to-end", () => {
    const beforeText = "line1\nline2\nline3";
    const afterText = "line1\nchanged\nline3";
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = computeTextDiff(beforeText, afterText, config);

    assertEquals(diffLines.length, 4);
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[0].content, "line1");
    assertEquals(diffLines[1].type, "removed");
    assertEquals(diffLines[1].content, "line2");
    assertEquals(diffLines[2].type, "added");
    assertEquals(diffLines[2].content, "changed");
    assertEquals(diffLines[3].type, "unchanged");
    assertEquals(diffLines[3].content, "line3");
  });

  test("handles empty inputs", () => {
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = computeTextDiff("", "", config);

    assertEquals(diffLines.length, 1); // Single empty line
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[0].content, "");
  });

  test("handles single line changes", () => {
    const beforeText = "old content";
    const afterText = "new content";
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffLines = computeTextDiff(beforeText, afterText, config);

    assertEquals(diffLines.length, 2);
    assertEquals(diffLines[0].type, "removed");
    assertEquals(diffLines[1].type, "added");
  });

  test("hides unchanged rows when configured", () => {
    const beforeText = "same\nchanged\nsame";
    const afterText = "same\nmodified\nsame";
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: true,
      beforeAfterColumn: false,
    };
    const diffLines = computeTextDiff(beforeText, afterText, config);

    assertEquals(diffLines.length, 2); // Only the changed lines
    assertEquals(diffLines[0].type, "removed");
    assertEquals(diffLines[1].type, "added");
  });
});

describe("computeCsvDiff", () => {
  test("computes CSV diff pipeline end-to-end", () => {
    const beforeText = "name,age\nJohn,25\nJane,30";
    const afterText = "name,age\nJohn,26\nJane,30";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
    };
    const diffTable = computeCsvDiff(beforeText, afterText, config);

    assertEquals(diffTable.headers, ["Column 1", "Column 2"]);
    assertEquals(diffTable.rows.length, 3); // Header + 2 data rows
    assertEquals(diffTable.rows[1].hasChanges, true);
    assertEquals(diffTable.rows[1].cells[1].hasChange, true);
    assertEquals(diffTable.rows[1].cells[1].before, "25");
    assertEquals(diffTable.rows[1].cells[1].after, "26");
  });

  test("hides unchanged rows when configured", () => {
    const beforeText = "a,b\n1,2\n3,4\n5,6";
    const afterText = "a,b\n1,2\n3,changed\n5,6";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: true,
      beforeAfterColumn: false,
    };
    const diffTable = computeCsvDiff(beforeText, afterText, config);

    assertEquals(diffTable.rows.length, 1); // Only the changed row
    assertEquals(diffTable.rows[0].rowNumber, 3);
    assertEquals(diffTable.rows[0].hasChanges, true);
  });
});
