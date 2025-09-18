import React from "react";

export interface TableCellProps {
  children: React.ReactNode;
  backgroundColor?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const TableCell = ({
  children,
  backgroundColor = "#f8f9fa",
  className,
  style,
  ...props
}: TableCellProps & React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={className}
    style={{
      backgroundColor,
      padding: "4px",
      border: "1px solid #dee2e6",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      ...style,
    }}
    {...props}
  >
    {children}
  </td>
);

export interface TableHeaderProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const TableHeader = ({
  children,
  className,
  style,
  ...props
}: TableHeaderProps & React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={className}
    style={{
      backgroundColor: "#f8f9fa",
      padding: "4px",
      border: "1px solid #dee2e6",
      fontWeight: "bold",
      textAlign: "center",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      ...style,
    }}
    {...props}
  >
    {children}
  </th>
);

export interface TextAreaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder: string;
  onDragOver?: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const TextArea = ({
  value,
  onChange,
  placeholder,
  onDragOver,
  onDrop,
  className,
  style,
  ...props
}: TextAreaProps) => (
  <textarea
    className={className}
    value={value}
    onChange={onChange}
    onDragOver={onDragOver}
    onDrop={onDrop}
    placeholder={placeholder}
    style={{
      boxSizing: "border-box",
      width: "100%",
      height: "300px",
      padding: "10px",
      border: "2px dashed #ccc",
      borderRadius: "5px",
      fontFamily: "monospace",
      resize: "vertical",
      ...style,
    }}
    {...props}
  />
);

export interface ModeButtonProps {
  children: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const ModeButton = ({
  children,
  isActive,
  onClick,
  className,
  style,
  ...props
}: ModeButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={className}
    type="button"
    onClick={onClick}
    style={{
      padding: "10px 20px",
      backgroundColor: isActive ? "#007bff" : "#f8f9fa",
      color: isActive ? "white" : "black",
      border: "1px solid #dee2e6",
      borderRadius: "5px",
      cursor: "pointer",
      ...style,
    }}
    {...props}
  >
    {children}
  </button>
);

export interface StyledFieldsetProps {
  legend: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  legendStyle?: React.CSSProperties;
}

export const StyledFieldset = ({
  legend,
  children,
  className,
  style,
  legendStyle,
  ...props
}: StyledFieldsetProps & React.FieldsetHTMLAttributes<HTMLFieldSetElement>) => (
  <fieldset
    className={className}
    style={{
      marginBottom: "20px",
      border: "2px solid #e9ecef",
      borderRadius: "8px",
      padding: "16px",
      backgroundColor: "#ffffff",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
      ...style,
    }}
    {...props}
  >
    <legend
      style={{
        fontSize: "16px",
        fontWeight: "bold",
        color: "#495057",
        padding: "0 8px",
        border: "none",
        backgroundColor: "transparent",
        ...legendStyle,
      }}
    >
      {legend}
    </legend>
    {children}
  </fieldset>
);

export interface CheckboxLabelProps {
  children: React.ReactNode;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const CheckboxLabel = ({
  children,
  checked,
  onChange,
  className,
  style,
  ...props
}: CheckboxLabelProps & React.InputHTMLAttributes<HTMLInputElement>) => (
  <label
    className={className}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "2px",
      fontSize: "14px",
      color: "#495057",
      cursor: "pointer",
      ...style,
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{
        cursor: "pointer",
      }}
      {...props}
    />
    {children}
  </label>
);

export interface ActionButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary" | "success" | "secondary";
  size?: "small" | "medium";
  className?: string;
  style?: React.CSSProperties;
}

export const ActionButton = ({
  children,
  onClick,
  variant = "primary",
  size = "medium",
  className,
  style,
  ...props
}: ActionButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const variantStyles = {
    primary: { backgroundColor: "#007bff", color: "white" },
    success: { backgroundColor: "#28a745", color: "white" },
    secondary: { backgroundColor: "#6c757d", color: "white" },
  };

  const sizeStyles = {
    small: { padding: "2px 8px", fontSize: "12px" },
    medium: { padding: "8px 16px", fontSize: "14px" },
  };

  return (
    <button
      className={className}
      type="button"
      onClick={onClick}
      style={{
        fontWeight: "500",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
