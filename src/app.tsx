import React, { useCallback, useState } from "react";
import {
  computeCsvDiff,
  computeTextDiff,
  detectChangedColumns,
  DiffConfig,
  DiffLine,
  DiffRow,
  DiffTable,
  exportDiffTableToCsv,
  WordChange,
} from "./domain/diff.ts";

import "./app.css";

export const App = () => {
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [config, setConfig] = useState<DiffConfig>({
    mode: "text",
    hideUnchangedRows: false,
    beforeAfterColumn: false,
    firstRowIsHeader: true,
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

  const handleDownloadCsv = useCallback(() => {
    if (config.mode !== "csv") return;

    const diffTable = computeCsvDiff(beforeText, afterText, config);
    const csvContent = exportDiffTableToCsv(diffTable, config);

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "diff-results.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [beforeText, afterText, config]);

  const renderDiff = () => {
    if (config.mode === "text") {
      const diffLines = computeTextDiff(beforeText, afterText, config);
      return <TextDiff diffLines={diffLines} />;
    } else {
      const diffTable = computeCsvDiff(beforeText, afterText, config);
      return <CsvDiff diffTable={diffTable} config={config} />;
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
                marginRight: "10px",
                backgroundColor: config.mode === "csv" ? "#007bff" : "#f8f9fa",
                color: config.mode === "csv" ? "white" : "black",
                border: "1px solid #dee2e6",
                borderRadius: "5px",
                cursor: "pointer",
              }}
            >
              CSV
            </button>
            {config.mode === "csv" && (
              <button
                type="button"
                onClick={handleDownloadCsv}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#28a745",
                  color: "white",
                  border: "1px solid #28a745",
                  borderRadius: "5px",
                  cursor: "pointer",
                }}
              >
                Download CSV
              </button>
            )}
          </div>

          {/* Configuration */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
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
                <label>
                  <input
                    type="checkbox"
                    checked={config.firstRowIsHeader}
                    onChange={(e) => setConfig({ ...config, firstRowIsHeader: e.target.checked })}
                  />
                  First row is header
                </label>
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
const TextDiff = ({ diffLines }: { diffLines: DiffLine[] }) => {
  const renderedLines = diffLines.map((diffLine) => {
    if (diffLine.type === "unchanged") {
      return (
        <div key={diffLine.lineNumber} style={{ backgroundColor: "#f8f9fa", padding: "2px 0" }}>
          <span style={{ color: "#6c757d" }}>{diffLine.lineNumber}</span>: {diffLine.content || " "}
        </div>
      );
    } else {
      // Added or removed line with word-level highlighting
      const backgroundColor = diffLine.type === "added" ? "#d4edda" : "#f8d7da";
      const signColor = diffLine.type === "added" ? "#155724" : "#721c24";
      const sign = diffLine.type === "added" ? "+" : "-";
      const lineType = diffLine.type === "added" ? "added" : "removed";

      return (
        <div key={`${diffLine.type}-${diffLine.lineNumber}`} style={{ backgroundColor, padding: "2px 0" }}>
          <span style={{ color: signColor }}>{sign}</span>
          <span style={{ color: "#6c757d" }}>{diffLine.lineNumber}</span>:{" "}
          {renderWordDiffs(diffLine.wordChanges || [], lineType)}
        </div>
      );
    }
  });

  return (
    <div style={{ fontFamily: "monospace", fontSize: "14px" }}>
      {renderedLines.length === 0 ? <p>No differences found.</p> : renderedLines}
    </div>
  );
};

// Helper function to render word-level diffs
const renderWordDiffs = (wordChanges: WordChange[], lineType: "added" | "removed") => {
  return (
    <span>
      {wordChanges.map((change, index) => {
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
const renderCellDiffs = (wordChanges: WordChange[]) => {
  return (
    <span>
      {wordChanges.map((change, index) => {
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
const CsvDiff = ({ diffTable, config }: { diffTable: DiffTable; config: DiffConfig }) => {
  const changedColumns = config.beforeAfterColumn ? detectChangedColumns(diffTable.rows) : new Set<number>();

  const renderedRows = diffTable.rows.map((diffRow: DiffRow) => {
    const rowCells: React.JSX.Element[] = [];
    let cellIndex = 0;

    for (let j = 0; j < diffRow.cells.length; j++) {
      const cell = diffRow.cells[j];
      const hasChange = cell.hasChange;

      if (config.beforeAfterColumn && changedColumns.has(j)) {
        // Before/After Column mode - add two columns for changed columns
        const backgroundColor = hasChange ? "#fff3cd" : "#f8f9fa";

        // Before column (new column)
        rowCells.push(
          <td
            key={`before-${cellIndex++}`}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {cell.before}
          </td>,
        );
        // After column (original column)
        rowCells.push(
          <td
            key={`after-${cellIndex++}`}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {cell.after}
          </td>,
        );
      } else {
        // Normal mode - single column
        let cellContent: React.JSX.Element;
        let backgroundColor: string;

        if (!hasChange) {
          backgroundColor = "#f8f9fa";
          cellContent = <span>{cell.before}</span>;
        } else {
          // Determine background color based on what changed
          backgroundColor = !cell.before && cell.after
            ? "#d4edda" // Only added value
            : cell.before && !cell.after
            ? "#f8d7da" // Only removed value
            : "#fff3cd"; // default for both values present

          if (!cell.before && cell.after) {
            // Only added value - show in green
            cellContent = (
              <span style={{ color: "#155724", fontWeight: "bold" }}>
                {cell.after}
              </span>
            );
          } else if (cell.before && !cell.after) {
            // Only removed value - show in red with strikethrough
            cellContent = (
              <span style={{ color: "#721c24", textDecoration: "line-through" }}>
                {cell.before}
              </span>
            );
          } else {
            // Both values present - show inline diff
            cellContent = renderCellDiffs(cell.wordChanges);
          }
        }

        rowCells.push(
          <td
            key={cellIndex++}
            style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
          >
            {cellContent}
          </td>,
        );
      }
    }

    return (
      <tr key={diffRow.rowNumber}>
        <td
          style={{
            backgroundColor: "#dee2e6",
            padding: "4px",
            border: "1px solid #dee2e6",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {diffRow.rowNumber}
        </td>
        {rowCells}
      </tr>
    );
  });

  // Render header row
  const renderHeaderRow = () => {
    const headerCells: React.JSX.Element[] = [];

    // Row number column header
    headerCells.push(
      <th key="row-number-header">
      </th>,
    );

    // Add headers from diffTable.headers
    diffTable.headers.forEach((header, index) => {
      headerCells.push(
        <th
          key={`header-${index}`}
          style={{
            backgroundColor: "#f8f9fa",
            padding: "4px",
            border: "1px solid #dee2e6",
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {header}
        </th>,
      );
    });

    return (
      <tr>
        {headerCells}
      </tr>
    );
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "monospace", fontSize: "14px" }}>
        <thead>
          {renderHeaderRow()}
        </thead>
        <tbody>
          {diffTable.rows.length === 0
            ? (
              <tr>
                <td colSpan={diffTable.headers.length + 1} style={{ padding: "20px", textAlign: "center" }}>
                  No differences found.
                </td>
              </tr>
            )
            : renderedRows}
        </tbody>
      </table>
    </div>
  );
};
