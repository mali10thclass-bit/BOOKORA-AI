import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
} from "lucide-react";

export interface Column<T> {
  accessorKey: string;
  header: string;
  cell?: (value: T, row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  sortable?: boolean;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string, direction: "asc" | "desc") => void;
  className?: string;
  rowKey?: string;
  emptyMessage?: string;
  hoverable?: boolean;
}

function Table<T extends Record<string, any>>(
  props: DataTableProps<T>
) {
  const {
    data,
    columns,
    sortable = false,
    sortColumn,
    sortDirection = "asc",
    onSort,
    className,
    rowKey = "id",
    emptyMessage = "No data available",
    hoverable = true,
  } = props;

  return (
    <div className={cn("relative w-full overflow-auto rounded-xl border border-slate-200/80", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100/50">
            {columns.map((col) => (
              <th
                key={col.accessorKey}
                className={cn(
                  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500",
                  col.sortable || sortable
                    ? "cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                    : "",
                  col.className
                )}
                onClick={() => {
                  if (sortable || col.sortable) {
                    const newDir =
                      sortColumn === col.accessorKey && sortDirection === "asc"
                        ? "desc"
                        : "asc";
                    onSort?.(col.accessorKey, newDir);
                  }
                }}
              >
                <div className="flex items-center gap-1.5">
                  {col.header}
                  {col.sortable || sortable ? (
                    sortColumn === col.accessorKey ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <ArrowDown className="h-3 w-3 text-emerald-600" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 text-slate-400" />
                    )
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-slate-400"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[rowKey] || Math.random()}
                className={cn(
                  "transition-colors",
                  hoverable &&
                    "hover:bg-gradient-to-r hover:from-emerald-50/30 hover:to-teal-50/30"
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.accessorKey}
                    className={cn(
                      "px-4 py-3 text-sm text-slate-700",
                      col.className
                    )}
                  >
                    {col.cell
                      ? col.cell(row[col.accessorKey], row)
                      : row[col.accessorKey]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  TableHeaderProps
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  TableBodyProps
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-slate-200", className)} {...props} />
));
TableBody.displayName = "TableBody";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
  selected?: boolean;
}
const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, hoverable = true, selected, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "transition-colors",
        hoverable &&
          "hover:bg-slate-50 hover:border-emerald-200",
        selected && "bg-emerald-50/50",
        className
      )}
      {...props}
    />
  )
);
TableRow.displayName = "TableRow";

interface TableCellProps extends React.TDHTMLAttributes<HTMLTableCellElement> {}
const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={cn("px-4 py-3 text-sm text-slate-700", className)}
      {...props}
    />
  )
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableCell };
