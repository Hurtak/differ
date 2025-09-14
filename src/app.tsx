import React, { useCallback, useState } from "react";

import "./app.css";

type DiffConfig = {
  mode: "text" | "csv";
  hideUnchanged: boolean;
};

export const App = () => {
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [config, setConfig] = useState<DiffConfig>({
    mode: "text",
    hideUnchanged: false,
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
                checked={config.hideUnchanged}
                onChange={(e) => setConfig({ ...config, hideUnchanged: e.target.checked })}
              />
              Hide unchanged rows
            </label>
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
  // Simple text diff implementation
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");

  const maxLines = Math.max(beforeLines.length, afterLines.length);
  const diffLines = Array.from({ length: maxLines }, (_, i) => {
    const beforeLine = beforeLines[i] || "";
    const afterLine = afterLines[i] || "";

    if (beforeLine === afterLine) {
      return !config.hideUnchanged
        ? (
          <div key={i} style={{ backgroundColor: "#f8f9fa", padding: "2px 0" }}>
            <span style={{ color: "#6c757d" }}>{i + 1}</span>: {beforeLine || " "}
          </div>
        )
        : null;
    } else {
      return [
        beforeLine
          ? (
            <div key={`before-${i}`} style={{ backgroundColor: "#f8d7da", padding: "2px 0" }}>
              <span style={{ color: "#721c24" }}>-</span>
              <span style={{ color: "#6c757d" }}>{i + 1}</span>: {beforeLine}
            </div>
          )
          : null,
        afterLine
          ? (
            <div key={`after-${i}`} style={{ backgroundColor: "#d4edda", padding: "2px 0" }}>
              <span style={{ color: "#155724" }}>+</span>
              <span style={{ color: "#6c757d" }}>{i + 1}</span>: {afterLine}
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

// CSV Diff Component
const CsvDiff = ({ before, after, config }: { before: string; after: string; config: DiffConfig }) => {
  const parseCSV = (text: string): string[][] => {
    return text.split("\n").map((line) => line.split(","));
  };

  const beforeRows = parseCSV(before);
  const afterRows = parseCSV(after);

  const maxRows = Math.max(beforeRows.length, afterRows.length);

  const diffRows = Array.from({ length: maxRows }, (_, i) => {
    const beforeRow = beforeRows[i];
    const afterRow = afterRows[i];

    if (!beforeRow && !afterRow) return null;

    const beforeCells = beforeRow || [];
    const afterCells = afterRow || [];
    const maxCells = Math.max(beforeCells.length, afterCells.length);

    const { rowCells, rowHasChanges } = Array.from({ length: maxCells }, (_, j) => {
      const beforeCell = beforeCells[j];
      const afterCell = afterCells[j];

      if (beforeCell === afterCell) {
        return {
          cell: (
            <td key={j} style={{ backgroundColor: "#f8f9fa", padding: "4px", border: "1px solid #dee2e6" }}>
              {beforeCell || ""}
            </td>
          ),
          hasChange: false,
        };
      } else {
        // Determine background color based on what changed
        const backgroundColor = !beforeCell && afterCell
          ? "#d4edda" // Only added value
          : beforeCell && !afterCell
          ? "#f8d7da" // Only removed value
          : "#fff3cd"; // default for both values present

        return {
          cell: (
            <td
              key={j}
              style={{ backgroundColor, padding: "4px", border: "1px solid #dee2e6" }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {beforeCell !== undefined && (
                  <span style={{ color: "#721c24", textDecoration: "line-through" }}>
                    {beforeCell}
                  </span>
                )}
                {afterCell !== undefined && (
                  <span style={{ color: "#155724", fontWeight: "bold" }}>
                    {afterCell}
                  </span>
                )}
              </div>
            </td>
          ),
          hasChange: true,
        };
      }
    }).reduce(
      (acc, { cell, hasChange }) => ({
        rowCells: [...acc.rowCells, cell],
        rowHasChanges: acc.rowHasChanges || hasChange,
      }),
      { rowCells: [] as React.JSX.Element[], rowHasChanges: false },
    );

    return (!config.hideUnchanged || rowHasChanges)
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

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontFamily: "monospace", fontSize: "14px" }}>
        <tbody>
          {diffRows.length === 0
            ? (
              <tr>
                <td style={{ padding: "20px", textAlign: "center" }}>No differences found.</td>
              </tr>
            )
            : diffRows}
        </tbody>
      </table>
    </div>
  );
};
