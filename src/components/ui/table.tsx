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
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className,
      )}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className,
    )}
    {...props}
  />
));
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
));
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };