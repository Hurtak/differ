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
import {
  ActionButton,
  CheckboxLabel,
  ModeButton,
  StyledFieldset,
  TableCell,
  TableHeader,
  TextArea,
} from "./components.tsx";

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
          <TextArea
            value={beforeText}
            onChange={(e) => setBeforeText(e.target.value)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setBeforeText)}
            placeholder="Paste text here or drag and drop a text or CSV file..."
          />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3>After</h3>
          <TextArea
            value={afterText}
            onChange={(e) => setAfterText(e.target.value)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, setAfterText)}
            placeholder="Paste text here or drag and drop a text or CSV file..."
          />
        </div>
      </div>

      {/* Diff View */}
      {(beforeText && afterText) && (
        <div>
          {/* Mode Tabs */}
          <StyledFieldset
            legend="Mode"
            legendStyle={{
              fontSize: "16px",
              fontWeight: "normal",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <ModeButton
                isActive={config.mode === "text"}
                onClick={() => setConfig({ ...config, mode: "text" })}
              >
                Text
              </ModeButton>
              <ModeButton
                isActive={config.mode === "csv"}
                onClick={() => setConfig({ ...config, mode: "csv" })}
              >
                CSV
              </ModeButton>
            </div>
          </StyledFieldset>

          {/* Configuration */}
          <StyledFieldset legend="Configuration">
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
              <CheckboxLabel
                checked={config.hideUnchangedRows}
                onChange={(e) => setConfig({ ...config, hideUnchangedRows: e.target.checked })}
              >
                Hide unchanged rows
              </CheckboxLabel>

              {config.mode === "csv" && (
                <>
                  <CheckboxLabel
                    checked={config.firstRowIsHeader}
                    onChange={(e) => setConfig({ ...config, firstRowIsHeader: e.target.checked })}
                  >
                    First row is header
                  </CheckboxLabel>
                  <CheckboxLabel
                    checked={config.beforeAfterColumn}
                    onChange={(e) => setConfig({ ...config, beforeAfterColumn: e.target.checked })}
                  >
                    Before/After Column
                  </CheckboxLabel>
                  <ActionButton
                    onClick={handleDownloadCsv}
                    variant="success"
                    size="small"
                  >
                    Download CSV
                  </ActionButton>
                </>
              )}
            </div>
          </StyledFieldset>

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
const renderCellDiffs = (wordChanges: WordChange[], showType?: "added" | "removed" | "all") => {
  return (
    <span>
      {wordChanges.map((change, index) => {
        if (!change.added && !change.removed) {
          // Common text
          return <span key={index}>{change.value}</span>;
        } else if (change.added && (showType === "added" || showType === "all" || !showType)) {
          // Added text - highlight with green
          return (
            <span
              key={index}
              style={{ backgroundColor: "#28a745", color: "white", padding: "1px 2px", borderRadius: "2px" }}
            >
              {change.value}
            </span>
          );
        } else if (change.removed && (showType === "removed" || showType === "all" || !showType)) {
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
        const _backgroundColor = hasChange ? "#fff3cd" : "#f8f9fa";

        // Before column (old values - highlight removed parts in red)
        rowCells.push(
          <TableCell
            key={`before-${cellIndex++}`}
            backgroundColor={cell.hasChange ? "#fef2f2" : ""}
          >
            {hasChange ? renderCellDiffs(cell.wordChanges, "removed") : cell.before}
          </TableCell>,
        );
        // After column (new values - highlight added parts in green)
        rowCells.push(
          <TableCell
            key={`after-${cellIndex++}`}
            backgroundColor={cell.hasChange ? "#f0fdf4" : ""}
          >
            {hasChange ? renderCellDiffs(cell.wordChanges, "added") : cell.after}
          </TableCell>,
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
          <TableCell
            key={cellIndex++}
            backgroundColor={backgroundColor}
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {cellContent}
          </TableCell>,
        );
      }
    }

    return (
      <tr key={diffRow.rowNumber}>
        <TableCell
          backgroundColor="#dee2e6"
          style={{
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {diffRow.rowNumber}
        </TableCell>
        {rowCells}
      </tr>
    );
  });

  // Render header row
  const renderHeaderRow = () => {
    const headerCells: React.JSX.Element[] = [];

    // Row number column header
    headerCells.push(
      <TableHeader key="row-number-header">
      </TableHeader>,
    );

    // Add headers from diffTable.headers
    diffTable.headers.forEach((header, index) => {
      headerCells.push(
        <TableHeader key={`header-${index}`}>
          {header}
        </TableHeader>,
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
                <TableCell
                  colSpan={diffTable.headers.length + 1}
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  No differences found.
                </TableCell>
              </tr>
            )
            : renderedRows}
        </tbody>
      </table>
    </div>
  );
};
