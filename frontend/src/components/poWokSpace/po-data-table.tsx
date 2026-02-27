import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type Column, // Import Column type
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { PurchaseOrderLine } from "@/types/po-workspace/types";
import { useAuthStore } from "@/stores/authStore";
import { StatusCell } from "./StatusCell";

interface PODataTableProps {
  data: PurchaseOrderLine[];
  onSelectionChange?: (selectedRows: PurchaseOrderLine[]) => void;
  onEditClick: (row: PurchaseOrderLine) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    notation: "standard",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * ✅ FIXED: Replaced 'any' with specific TanStack Column type
 */
interface SortableHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
}

function SortableHeader<TData, TValue>({ column, title }: SortableHeaderProps<TData, TValue>) {
  const isSorted = column.getIsSorted();
  return (
    <button
      type="button"
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => column.toggleSorting(isSorted === "asc")}
    >
      {title}
      {isSorted === "asc" ? (
        <ArrowUp className="h-3 w-3 text-primary" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="h-3 w-3 text-primary" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
}

export function PODataTable({ data, onSelectionChange, onEditClick }: PODataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const user = useAuthStore((state) => state.user);

  const columns = useMemo<ColumnDef<PurchaseOrderLine>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            ref={(el) => {
              if (el) el.indeterminate = table.getIsSomePageRowsSelected();
            }}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
        size: 20,
      },
      {
        accessorKey: "duid",
        header: ({ column }) => <SortableHeader column={column} title="DUID" />,
        cell: ({ row }) => <span className="text-xs">{row.getValue("duid")}</span>,
        size: 80,
      },
      {
        accessorKey: "poNumber",
        header: ({ column }) => <SortableHeader column={column} title="PO Number" />,
        cell: ({ row }) => <span className="text-xs text-primary">{row.getValue("poNumber")}</span>,
        size: 80,
      },
      {
        accessorKey: "projectCode",
        header: ({ column }) => <SortableHeader column={column} title="Project Code" />,
        cell: ({ row }) => <span className="text-xs">{row.getValue("projectCode")}</span>,
        size: 50,
      },
      {
        accessorKey: "projectName",
        header: ({ column }) => <SortableHeader column={column} title="Project Name" />,
        cell: ({ row }) => (
          <span className="text-xs truncate max-w-45 block" title={row.getValue("projectName")}>
            {row.getValue("projectName")}
          </span>
        ),
        size: 50,
      },
      {
        accessorKey: "pm",
        header: ({ column }) => <SortableHeader column={column} title="PM" />,
        cell: ({ row }) => <span className="text-xs">{row.getValue("pm")}</span>,
        size: 50,
      },
      {
        accessorKey: "poLineNumber",
        header: ({ column }) => <SortableHeader column={column} title="Line" />,
        cell: ({ row }) => (
          <span className="text-xs text-center block">{row.getValue("poLineNumber")}</span>
        ),
        size: 20,
      },
      {
        accessorKey: "poType",
        header: ({ column }) => <SortableHeader column={column} title="Type" />,
        cell: ({ row }) => (
          <span className="text-[10px] px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground uppercase font-bold">
            {row.getValue("poType")}
          </span>
        ),
        sixze: 80,
      },
      {
        accessorKey: "unitPrice",
        header: ({ column }) => <SortableHeader column={column} title="Price" />,
        cell: ({ row }) => (
          <span className="text-xs font-semibold">{formatCurrency(row.getValue("unitPrice"))}</span>
        ),
        size: 50,
      },
      {
        accessorKey: "requestedQuantity",
        header: ({ column }) => <SortableHeader column={column} title="Qty" />,
        cell: ({ row }) => (
          <span className="text-xs text-center block">{row.getValue("requestedQuantity")}</span>
        ),
        size: 20,
      },
      {
        accessorKey: "poLineAmount",
        header: ({ column }) => <SortableHeader column={column} title="Total" />,
        cell: ({ row }) => (
          <span className="text-xs font-bold">{formatCurrency(row.getValue("poLineAmount"))}</span>
        ),
        size: 50,
      },
      {
        accessorKey: "itemDescription",
        header: ({ column }) => <SortableHeader column={column} title="Description" />,
        cell: ({ row }) => (
          <span className="text-xs truncate max-w-50 block" title={row.getValue("itemDescription")}>
            {row.getValue("itemDescription")}
          </span>
        ),
        size: 100,
      },
      {
        id: "contractAmount",
        header: "Contract Amt",
        cell: ({ row }) => {
          const amount = Number(row.original.contractAmount ?? 0);
          const isSuperAdmin = user?.role === "SUPER_ADMIN";
          const isSet = amount > 0;
          const canEdit = isSuperAdmin && isSet;

          return (
            <div className="flex justify-end">
              <button
                type="button"
                disabled={!canEdit}
                className={`text-[8px] font-bold px-2 py-1 rounded transition-all border 
                  ${canEdit ? "border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100" : "border-transparent text-slate-500 opacity-80"}`}
                onClick={() => canEdit && onEditClick(row.original)}
              >
                {isSet ? formatCurrency(amount) : "AWAITING SETUP"}
              </button>
            </div>
          );
        },
        size: 50,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <SortableHeader column={column} title="Status" />,
        cell: ({ row }) => {
          const id = row.original.id;
          const status = row.original.status;
          if (!id || !status)
            return <span className="text-[10px] text-slate-400 italic">No Data</span>;
          return <StatusCell id={id} currentStatus={status} />;
        },
        size: 50,
      },
    ],
    [user?.role, onEditClick],
  );

  // This is a warning, not an error. TanStack Table functions are meant to stay "fresh".
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onRowSelectionChange: (updaterOrValue) => {
      const nextSelection =
        typeof updaterOrValue === "function" ? updaterOrValue(rowSelection) : updaterOrValue;

      setRowSelection(nextSelection);
      if (onSelectionChange) {
        const selected = data.filter((row) => !!nextSelection[row.id]);
        onSelectionChange(selected);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowId: (row) => row.id,
  });

  return (
    <div className="rounded-md border border-border bg-card overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-slate-100 text dark:bg-slate-300">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="p-3 text-left border-b text-slate-950 font-bold"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
