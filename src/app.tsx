import React, { useCallback, useState } from "react";
import * as diff from "diff";

import "./app.css";

type DiffConfig = {
  mode: "text" | "csv";
  hideUnchangedRows: boolean;
  beforeAfterColumn: boolean;
};

export const App = () => {
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [config, setConfig] = useState<DiffConfig>({
    mode: "text",
    hideUnchangedRows: false,
    beforeAfterColumn: false,
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, setText: (text: string) => void) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setText(content);
      };
      reader.readAsText(file);
    }
  }, []);

  const renderDiff = () => {
    if (config.mode === "text") {
      return <TextDiff before={beforeText} after={afterText} config={config} />;
    } else {
      return <CsvDiff before={beforeText} after={afterText} config={config} />;
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1900px", margin: "0 auto", fontFamily: "Arial, sans-serif" }}>
      <h1>Differ</h1>

      {/* Input Section */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>Before</h3>
          <textarea
            value={beforeText}
            onChange={(e) => setBeforeText(e.target.value)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setBeforeText)}
            placeholder="Paste text here or drag and drop a file..."
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "300px",
              padding: "10px",
              border: "2px dashed #ccc",
              borderRadius: "5px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>After</h3>
          <textarea
            value={afterText}
            onChange={(e) => setAfterText(e.target.value)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setAfterText)}
            placeholder="Paste text here or drag and drop a file..."
            style={{
              boxSizing: "border-box",
              width: "100%",
              height: "300px",
              padding: "10px",
              border: "2px dashed #ccc",
              borderRadius: "5px",
              fontFamily: "monospace",
              resize: "vertical",
            }}
          />
        </div>
      </div>

      {/* Diff View */}
      {(beforeText && afterText) && (
        <div>
          {/* Mode Tabs */}
          <div style={{ marginBottom: "20px" }}>
            <button
              type="button"
              onClick={() => setConfig({ ...config, mode: "text" })}
              style={{
                padding: "10px 20px",
                marginRight: "10px",
                backgroundColor: config.mode === "text" ? "#007bff" : "#f8f9fa",
                color: config.mode === "text" ? "white" : "black",
                border: "1px solid #dee2e6",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setConfig({ ...config, mode: "csv" })}
              style={{
                padding: "10px 20px",
                backgroundColor: config.mode === "csv" ? "#007bff" : "#f8f9fa",
                color: config.mode === "csv" ? "white" : "black",
                border: "1px solid #dee2e6",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              CSV
            </button>
          </div>

          {/* Configuration */}
          <div style={{ marginBottom: "20px" }}>
            <label>
              <input
                type="checkbox"
                checked={config.hideUnchangedRows}
                onChange={(e) => setConfig({ ...config, hideUnchangedRows: e.target.checked })}
              />
              Hide unchanged rows
            </label>
            {config.mode === "csv" && (
              <>
                {" "}
                <label>
                  <input
                    type="checkbox"
                    checked={config.beforeAfterColumn}
                    onChange={(e) => setConfig({ ...config, beforeAfterColumn: e.target.checked })}
                  />
                  Before/After Column
                </label>
              </>
            )}
          </div>

          {/* Diff Output */}
          <div
            style={{
              border: "1px solid #dee2e6",
              borderRadius: "5px",
              padding: "20px",
              backgroundColor: "#f8f9fa",
            }}
          >
            {renderDiff()}
          </div>
        </div>
      )}
    </div>
  );
};

// Text Diff Component
const TextDiff = ({ before, after, config }: { before: string; after: string; config: DiffConfig }) => {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const maxLines = Math.max(beforeLines.length, afterLines.length);

  const diffLines = Array.from({ length: maxLines }, (_, i) => {
    const beforeLine = beforeLines[i] || "";
    const afterLine = afterLines[i] || "";

    if (beforeLine === afterLine) {
      return !config.hideUnchangedRows
        ? (
          <div key={i} style={{ backgroundColor: "#f8f9fa", padding: "2px 0" }}>
            <span style={{ color: "#6c757d" }}>{i + 1}</span>: {beforeLine || " "}
          </div>
        )
        : null;
    } else {
      // Lines are different - show both with word-level inline highlighting
      const wordDiffs = diff.diffWords(beforeLine, afterLine);

      return [
        beforeLine
          ? (
            <div key={`before-${i}`} style={{ backgroundColor: "#f8d7da", padding: "2px 0" }}>
              <span style={{ color: "#721c24" }}>-</span>
              <span style={{ color: "#6c757d" }}>{i + 1}</span>: {renderWordDiffs(wordDiffs, "removed")}
            </div>
          )
          : null,
        afterLine
          ? (
            <div key={`after-${i}`} style={{ backgroundColor: "#d4edda", padding: "2px 0" }}>
              <span style={{ color: "#155724" }}>+</span>
              <span style={{ color: "#6c757d" }}>{i + 1}</span>: {renderWordDiffs(wordDiffs, "added")}
            </div>
          )
          : null,
      ].filter(Boolean);
    }
  }).flat().filter(Boolean);

  return (
    <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
      {diffLines.length === 0 ? <p>No differences found.</p> : diffLines}
    </div>
  );
};

// Helper function to render word-level diffs
const renderWordDiffs = (wordDiffs: diff.Change[], lineType: "added" | "removed") => {
  return (
    <span>
      {wordDiffs.map((change, index) => {
        if (!change.added && !change.removed) {
          // Common text - show in both lines
          return <span key={index}>{change.value}</span>;
        } else if (change.removed && lineType === "removed") {
          // Removed text in removed line - highlight with red background
          return (
            <span
              key={index}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                padding: "1px 2px",
                borderRadius: "2px",
              }}
            >
              {change.value}
            </span>
          );
        } else if (change.added && lineType === "added") {
          // Added text in added line - highlight with green
          return (
            <span
              key={index}
              style={{ backgroundColor: "#28a745", color: "white", padding: "1px 2px", borderRadius: "2px" }}
            >
              {change.value}
            </span>
          );
        }
        // Skip changes that don't belong in this line type
        return null;
      }).filter(Boolean)}
    </span>
  );
};

// Helper function to render cell-level diffs (similar to word diffs but for cell content)
const renderCellDiffs = (beforeCell: string, afterCell: string) => {
  // Handle empty strings
  const before = beforeCell || "";
  const after = afterCell || "";
  const cellDiffs = diff.diffWords(before, after);

  return (
    <span>
      {cellDiffs.map((change, index) => {
        if (!change.added && !change.removed) {
          // Common text
          return <span key={index}>{change.value}</span>;
        } else if (change.added) {
          // Added text - highlight with green
          return (
            <span
              key={index}
              style={{ backgroundColor: "#28a745", color: "white", padding: "1px 2px", borderRadius: "2px" }}
            >
              {change.value}
            </span>
          );
        } else if (change.removed) {
          // Removed text - highlight with red
          return (
            <span
              key={index}
              style={{
                backgroundColor: "#dc3545",
                color: "white",
                padding: "1px 2px",
                borderRadius: "2px",
              }}
            >
              {change.value}
            </span>
          );
        }
        return null;
      }).filter(Boolean)}
    </span>
  );
};

// CSV Diff Component
const CsvDiff = ({ before, after, config }: { before: string; after: string; config: DiffConfig }) => {
  const parseCSV = (text: string): string[][] => {
    return text.split("\n").map((line) => line.split(","));
  };

  const beforeRows = parseCSV(before);
  const afterRows = parseCSV(after);

  const maxRows = Math.max(beforeRows.length, afterRows.length);
  const maxCols = Math.max(
    ...beforeRows.map((row) => row.length),
    ...afterRows.map((row) => row.length),
  );

  // Detect which columns have changes
  const changedColumns = new Set<number>();
  if (config.beforeAfterColumn) {
    for (let col = 0; col < maxCols; col++) {
      for (let row = 0; row < maxRows; row++) {
        const beforeCell = beforeRows[row]?.[col] || "";
        const afterCell = afterRows[row]?.[col] || "";
        if (beforeCell !== afterCell) {
          changedColumns.add(col);
          break; // No need to check more rows for this column
        }
      }
    }
  }

  const diffRows = Array.from({ length: maxRows }, (_, i) => {
    const beforeRow = beforeRows[i];
    const afterRow = afterRows[i];

    if (!beforeRow && !afterRow) return null;

    const beforeCells = beforeRow || [];
    const afterCells = afterRow || [];
    const maxCells = Math.max(beforeCells.length, afterCells.length);

    const rowCells: React.JSX.Element[] = [];
    let rowHasChanges = false;

    for (let j = 0; j < maxCells; j++) {
      const beforeCell = beforeCells[j] || "";
      const afterCell = afterCells[j] || "";
      const hasChange = beforeCell !== afterCell;

      if (hasChange) {
        rowHasChanges = true;
      }

      if (config.beforeAfterColumn && changedColumns.has(j)) {
        // Before/After Column mode - add two columns for changed columns
        const backgroundColor = hasChange ? "#fff3cd" : "#f8f9fa";

        // After column (original column)
        rowCells.push(
          <td
            key={`after-${j}`}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {afterCell}
          </td>,
        );

        // Before column (new column)
        rowCells.push(
          <td
            key={`before-${j}`}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {beforeCell}
          </td>,
        );
      } else {
        // Normal mode - single column
        let cellContent: React.JSX.Element;
        let backgroundColor: string;

        if (!hasChange) {
          backgroundColor = "#f8f9fa";
          cellContent = <span>{beforeCell}</span>;
        } else {
          // Determine background color based on what changed
          backgroundColor = !beforeCell && afterCell
            ? "#d4edda" // Only added value
            : beforeCell && !afterCell
            ? "#f8d7da" // Only removed value
            : "#fff3cd"; // default for both values present

          if (!beforeCell && afterCell) {
            // Only added value - show in green
            cellContent = (
              <span style={{ color: "#155724", fontWeight: "bold" }}>
                {afterCell}
              </span>
            );
          } else if (beforeCell && !afterCell) {
            // Only removed value - show in red with strikethrough
            cellContent = (
              <span style={{ color: "#721c24", textDecoration: "line-through" }}>
                {beforeCell}
              </span>
            );
          } else {
            // Both values present - show inline diff
            cellContent = renderCellDiffs(beforeCell, afterCell);
          }
        }

        rowCells.push(
          <td
            key={j}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {cellContent}
          </td>,
        );
      }
    }

    return (!config.hideUnchangedRows || rowHasChanges)
      ? (
        <tr key={i}>
          <td style={{ backgroundColor: "#e9ecef", padding: "4px", border: "1px solid #dee2e6", fontWeight: "bold" }}>
            Row {i + 1}
          </td>
          {rowCells}
        </tr>
      )
      : null;
  }).filter(Boolean);

  // Create header row
  const headerCells: React.JSX.Element[] = [];
  for (let j = 0; j < maxCols; j++) {
    if (config.beforeAfterColumn && changedColumns.has(j)) {
      // Add two headers for changed columns
      headerCells.push(
        <td
          key={`header-after-${j}`}
          style={{ backgroundColor: "#e9ecef", padding: "4px", border: "1px solid #dee2e6", fontWeight: "bold" }}
        >
          Column {j + 1}
        </td>,
      );
      headerCells.push(
        <td
          key={`header-before-${j}`}
          style={{ backgroundColor: "#e9ecef", padding: "4px", border: "1px solid #dee2e6", fontWeight: "bold" }}
        >
          Column {j + 1} Before
        </td>,
      );
    } else {
      // Single header for unchanged columns
      headerCells.push(
        <td
          key={`header-${j}`}
          style={{ backgroundColor: "#e9ecef", padding: "4px", border: "1px solid #dee2e6", fontWeight: "bold" }}
        >
          Column {j + 1}
        </td>,
      );
    }
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "monospace", fontSize: "14px" }}>
        <thead>
          <tr>
            <td style={{ backgroundColor: "#e9ecef", padding: "4px", border: "1px solid #dee2e6", fontWeight: "bold" }}>
              Row
            </td>
            {headerCells}
          </tr>
        </thead>
        <tbody>
          {diffRows.length === 0
            ? (
              <tr>
                <td colSpan={headerCells.length + 1} style={{ padding: "20px", textAlign: "center" }}>
                  No differences found.
                </td>
              </tr>
            )
            : diffRows}
        </tbody>
      </table>
    </div>
  );
};
