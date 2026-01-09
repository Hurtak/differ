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
  exportDiffTableToCsv,
  extractCsvHeaders,
  generateCsvHeaders,
  parseCsvLine,
  parseCsvToRows,
  parseTextToLines,
  stripCsvFormattingQuotes,
} from "./diff.ts";

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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    assertEquals(diffLines.length, 2); // Only the changed line
    assertEquals(diffLines[0].type, "removed");
    assertEquals(diffLines[1].type, "added");
  });

  test("correctly detects single line removal when subsequent lines shift", () => {
    // When line 2 is removed, lines 3-5 should be detected as unchanged, not as changes
    const beforeLines = ["1", "2", "3", "4", "5"];
    const afterLines = ["1", "3", "4", "5"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    // Should have 5 lines: 4 unchanged + 1 removed
    assertEquals(diffLines.length, 5);

    // Line 1 should be unchanged
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[0].content, "1");
    assertEquals(diffLines[0].lineNumber, 1);

    // Line 2 should be removed
    assertEquals(diffLines[1].type, "removed");
    assertEquals(diffLines[1].content, "2");
    assertEquals(diffLines[1].lineNumber, 2);

    // Lines 3, 4, 5 should be unchanged
    assertEquals(diffLines[2].type, "unchanged");
    assertEquals(diffLines[2].content, "3");

    assertEquals(diffLines[3].type, "unchanged");
    assertEquals(diffLines[3].content, "4");

    assertEquals(diffLines[4].type, "unchanged");
    assertEquals(diffLines[4].content, "5");
  });

  test("correctly detects single line addition when subsequent lines shift", () => {
    // When a new line is added at position 2, lines should be detected as shifted not changed
    const beforeLines = ["1", "3", "4", "5"];
    const afterLines = ["1", "2", "3", "4", "5"];
    const config: DiffConfig = {
      mode: "text",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };
    const diffLines = createDiffLines(beforeLines, afterLines, config);

    // Should have 5 lines: 4 unchanged + 1 added
    assertEquals(diffLines.length, 5);

    // Line 1 should be unchanged
    assertEquals(diffLines[0].type, "unchanged");
    assertEquals(diffLines[0].content, "1");

    // Line 2 should be added
    assertEquals(diffLines[1].type, "added");
    assertEquals(diffLines[1].content, "2");

    // Lines 3, 4, 5 should be unchanged
    assertEquals(diffLines[2].type, "unchanged");
    assertEquals(diffLines[2].content, "3");

    assertEquals(diffLines[3].type, "unchanged");
    assertEquals(diffLines[3].content, "4");

    assertEquals(diffLines[4].type, "unchanged");
    assertEquals(diffLines[4].content, "5");
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
    };
    const headers = generateCsvHeaders(3, changedColumns, config);

    assertEquals(headers, ["Column 1", "Column 2 Before", "Column 2 After", "Column 3"]);
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
      firstRowIsHeader: true,
    };
    const diffTable = createCsvDiffTable(beforeText, afterText, config);

    assertEquals(diffTable.headers, ["a", "b"]);
    assertEquals(diffTable.rows.length, 1); // Only data row, header is extracted separately
    assertEquals(diffTable.rows[0].hasChanges, false);
  });

  test("creates diff table with changes", () => {
    const beforeText = "a,b\n1,2";
    const afterText = "a,b\n1,changed";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };
    const diffTable = createCsvDiffTable(beforeText, afterText, config);

    assertEquals(diffTable.rows[0].hasChanges, true); // Now rows[0] is the data row
    assertEquals(diffTable.rows[0].cells[1].hasChange, true);
  });

  test("creates diff table with headers in before/after mode", () => {
    const beforeText = "Name,Value\nold1,value2\nold3,value4";
    const afterText = "Name,Value\nnew1,value2\nnew3,value4";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: true,
      firstRowIsHeader: true,
    };
    const diffTable = createCsvDiffTable(beforeText, afterText, config);

    // Should modify existing headers for columns with changes
    assertEquals(diffTable.headers.length, 3); // Name Before, Name After, Value
    assertEquals(diffTable.headers[0], "Name Before");
    assertEquals(diffTable.headers[1], "Name After");
    assertEquals(diffTable.headers[2], "Value");

    // Data should be correctly structured (first row of CSV is treated as headers, not data)
    assertEquals(diffTable.rows.length, 2); // Two data rows
    assertEquals(diffTable.rows[0].cells[0].before, "old1");
    assertEquals(diffTable.rows[0].cells[0].after, "new1");
    assertEquals(diffTable.rows[0].cells[1].before, "value2");
    assertEquals(diffTable.rows[0].cells[1].after, "value2");
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
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
      firstRowIsHeader: true,
    };
    const diffTable = computeCsvDiff(beforeText, afterText, config);

    assertEquals(diffTable.headers, ["name", "age"]);
    assertEquals(diffTable.rows.length, 2); // 2 data rows (header extracted separately)
    assertEquals(diffTable.rows[0].hasChanges, true); // Now rows[0] is the first data row
    assertEquals(diffTable.rows[0].cells[1].hasChange, true);
    assertEquals(diffTable.rows[0].cells[1].before, "25");
    assertEquals(diffTable.rows[0].cells[1].after, "26");
  });

  test("hides unchanged rows when configured", () => {
    const beforeText = "a,b\n1,2\n3,4\n5,6";
    const afterText = "a,b\n1,2\n3,changed\n5,6";
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: true,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };
    const diffTable = computeCsvDiff(beforeText, afterText, config);

    assertEquals(diffTable.rows.length, 1); // Only the changed row (header extracted separately)
    assertEquals(diffTable.rows[0].rowNumber, 3);
    assertEquals(diffTable.rows[0].hasChanges, true);
  });
});

describe("exportDiffTableToCsv", () => {
  test("exports basic CSV with headers and data", () => {
    const diffTable = {
      headers: ["Name", "Age", "City"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: false,
          cells: [
            { before: "John", after: "John", hasChange: false, wordChanges: [] },
            { before: "25", after: "25", hasChange: false, wordChanges: [] },
            { before: "NYC", after: "NYC", hasChange: false, wordChanges: [] },
          ],
        },
        {
          rowNumber: 2,
          hasChanges: true,
          cells: [
            { before: "Jane", after: "Jane", hasChange: false, wordChanges: [] },
            { before: "30", after: "31", hasChange: true, wordChanges: [] },
            { before: "LA", after: "LA", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Name","Age","City"\n"John","25","NYC"\n"Jane","31","LA"';

    assertEquals(csv, expected);
  });

  test("exports CSV with no headers", () => {
    const diffTable = {
      headers: [],
      rows: [
        {
          rowNumber: 1,
          hasChanges: false,
          cells: [
            { before: "value1", after: "value1", hasChange: false, wordChanges: [] },
            { before: "value2", after: "value2", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = `"value1","value2"`;

    assertEquals(csv, expected);
  });

  test("exports CSV with special characters and quotes", () => {
    const diffTable = {
      headers: ["Description", "Value"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: false,
          cells: [
            { before: 'Hello "World"', after: 'Hello "World"', hasChange: false, wordChanges: [] },
            { before: "Value, with comma", after: "Value, with comma", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Description","Value"\n"Hello ""World""","Value, with comma"';

    assertEquals(csv, expected);
  });

  test("exports CSV with empty values", () => {
    const diffTable = {
      headers: ["A", "B", "C"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: false,
          cells: [
            { before: "", after: "", hasChange: false, wordChanges: [] },
            { before: "value", after: "", hasChange: true, wordChanges: [] },
            { before: "", after: "new", hasChange: true, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"A","B","C"\n"","","new"';

    assertEquals(csv, expected);
  });

  test("exports CSV in before/after column mode", () => {
    const diffTable = {
      headers: ["Name", "Age Before", "Age After", "City"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: true,
          cells: [
            { before: "John", after: "John", hasChange: false, wordChanges: [] },
            { before: "25", after: "26", hasChange: true, wordChanges: [] },
            { before: "NYC", after: "NYC", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: true,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Name","Age Before","Age After","City"\n"John","25","26","NYC"';

    assertEquals(csv, expected);
  });

  test("exports CSV with no rows", () => {
    const diffTable = {
      headers: ["Name", "Age"],
      rows: [],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Name","Age"';

    assertEquals(csv, expected);
  });

  test("exports CSV with multiple rows and mixed changes", () => {
    const diffTable = {
      headers: ["ID", "Name", "Status"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: false,
          cells: [
            { before: "1", after: "1", hasChange: false, wordChanges: [] },
            { before: "Alice", after: "Alice", hasChange: false, wordChanges: [] },
            { before: "active", after: "active", hasChange: false, wordChanges: [] },
          ],
        },
        {
          rowNumber: 2,
          hasChanges: true,
          cells: [
            { before: "2", after: "2", hasChange: false, wordChanges: [] },
            { before: "Bob", after: "Robert", hasChange: true, wordChanges: [] },
            { before: "inactive", after: "active", hasChange: true, wordChanges: [] },
          ],
        },
        {
          rowNumber: 3,
          hasChanges: false,
          cells: [
            { before: "3", after: "3", hasChange: false, wordChanges: [] },
            { before: "Charlie", after: "Charlie", hasChange: false, wordChanges: [] },
            { before: "active", after: "active", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"ID","Name","Status"\n"1","Alice","active"\n"2","Robert","active"\n"3","Charlie","active"';

    assertEquals(csv, expected);
  });

  test("handles cells with only before values (deletions)", () => {
    const diffTable = {
      headers: ["Name", "Value"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: true,
          cells: [
            { before: "Test", after: "", hasChange: true, wordChanges: [] },
            { before: "123", after: "", hasChange: true, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Name","Value"\n"",""';

    assertEquals(csv, expected);
  });

  test("handles cells with only after values (additions)", () => {
    const diffTable = {
      headers: ["Name", "Value"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: true,
          cells: [
            { before: "", after: "New", hasChange: true, wordChanges: [] },
            { before: "", after: "456", hasChange: true, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: false,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Name","Value"\n"New","456"';

    assertEquals(csv, expected);
  });

  test("exports CSV with no headers in before/after mode", () => {
    const diffTable = {
      headers: ["Column 1 Before", "Column 1 After", "Column 2"],
      rows: [
        {
          rowNumber: 1,
          hasChanges: true,
          cells: [
            { before: "old1", after: "new1", hasChange: true, wordChanges: [] },
            { before: "value2", after: "value2", hasChange: false, wordChanges: [] },
          ],
        },
      ],
    };
    const config: DiffConfig = {
      mode: "csv",
      hideUnchangedRows: false,
      beforeAfterColumn: true,
      firstRowIsHeader: true,
    };

    const csv = exportDiffTableToCsv(diffTable, config);
    const expected = '"Column 1 Before","Column 1 After","Column 2"\n"old1","new1","value2"';

    assertEquals(csv, expected);
  });
});

describe("parseCsvLine", () => {
  test("parses simple CSV line without quotes", () => {
    const input = "a,b,c";
    const expected = ["a", "b", "c"];
    assertEquals(parseCsvLine(input), expected);
  });

  test("parses CSV line with quoted fields containing commas", () => {
    const input = '"a,b",c,"d,e"';
    const expected = ["a,b", "c", "d,e"];
    assertEquals(parseCsvLine(input), expected);
  });

  test("parses CSV line with quoted fields containing quotes", () => {
    const input = '"He said ""Hello""",world';
    const expected = ['He said "Hello"', "world"];
    assertEquals(parseCsvLine(input), expected);
  });

  test("parses CSV line with mixed quoted and unquoted fields", () => {
    const input = 'name,"John,Doe",age,25';
    const expected = ["name", "John,Doe", "age", "25"];
    assertEquals(parseCsvLine(input), expected);
  });

  test("handles empty fields", () => {
    const input = 'a,,"c"';
    const expected = ["a", "", "c"];
    assertEquals(parseCsvLine(input), expected);
  });

  test("handles single field", () => {
    const input = '"single field"';
    const expected = ["single field"];
    assertEquals(parseCsvLine(input), expected);
  });
});

describe("stripCsvFormattingQuotes", () => {
  test("strips quotes from field without special characters", () => {
    const input = '"hello"';
    const expected = "hello";
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("keeps quotes when field contains comma", () => {
    const input = '"hello,world"';
    const expected = '"hello,world"';
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("keeps quotes when field contains newline", () => {
    const input = '"hello\nworld"';
    const expected = '"hello\nworld"';
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("keeps quotes when field contains quotes", () => {
    const input = '"He said ""Hello"""';
    const expected = '"He said ""Hello"""';
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("leaves unquoted field unchanged", () => {
    const input = "hello";
    const expected = "hello";
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("leaves partially quoted field unchanged", () => {
    const input = '"hello';
    const expected = '"hello';
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });

  test("strips quotes from numeric field", () => {
    const input = '"12345"';
    const expected = "12345";
    assertEquals(stripCsvFormattingQuotes(input), expected);
  });
});

describe("extractCsvHeaders", () => {
  test("extracts and strips quotes from headers", () => {
    const beforeRows = [['"Name"', '"Age"', '"City"']];
    const afterRows = [['"Name"', '"Age"', '"City"']];
    const expected = ["Name", "Age", "City"];
    assertEquals(extractCsvHeaders(beforeRows, afterRows), expected);
  });

  test("handles mixed quoted and unquoted headers", () => {
    const beforeRows: string[][] = [];
    const afterRows = [["Name", '"Age,City"', "Country"]];
    const expected = ["Name", '"Age,City"', "Country"];
    assertEquals(extractCsvHeaders(beforeRows, afterRows), expected);
  });

  test("returns empty array when no rows", () => {
    const beforeRows: string[][] = [];
    const afterRows: string[][] = [];
    const expected: string[] = [];
    assertEquals(extractCsvHeaders(beforeRows, afterRows), expected);
  });
});

describe("createDiffCells with quoted fields", () => {
  test("strips formatting quotes from cells", () => {
    const beforeRow = ["John", "25", "NYC"];
    const afterRow = ["Jane", "26", "LA"];
    const diffCells = createDiffCells(beforeRow, afterRow);

    assertEquals(diffCells[0].before, "John");
    assertEquals(diffCells[0].after, "Jane");
    assertEquals(diffCells[1].before, "25");
    assertEquals(diffCells[1].after, "26");
    assertEquals(diffCells[2].before, "NYC");
    assertEquals(diffCells[2].after, "LA");
  });

  test("preserves content quotes in cells", () => {
    const beforeRow = ["John,Doe", 'He said "Hi"'];
    const afterRow = ["Jane,Doe", 'She said "Hi"'];
    const diffCells = createDiffCells(beforeRow, afterRow);

    assertEquals(diffCells[0].before, "John,Doe");
    assertEquals(diffCells[0].after, "Jane,Doe");
    assertEquals(diffCells[1].before, 'He said "Hi"');
    assertEquals(diffCells[1].after, 'She said "Hi"');
  });
});

describe("parseCsvToRows with quoted fields", () => {
  test("parses CSV with quoted fields containing commas", () => {
    const input = '"Name,Full","Age"\n"John,Doe",25\n"Jane,Smith",30';
    const expected = [
      ["Name,Full", "Age"],
      ["John,Doe", "25"],
      ["Jane,Smith", "30"],
    ];
    assertEquals(parseCsvToRows(input), expected);
  });

  test("parses CSV with escaped quotes", () => {
    const input = '"He said ""Hello""","She replied ""Hi"""';
    const expected = [['He said "Hello"', 'She replied "Hi"']];
    assertEquals(parseCsvToRows(input), expected);
  });
});
