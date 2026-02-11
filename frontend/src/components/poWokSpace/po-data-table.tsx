"use client";

import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { PurchaseOrderLine } from "@/lib/po-workspace/types";

interface PODataTableProps {
    data: PurchaseOrderLine[];
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

export function PODataTable({ data }: PODataTableProps) {
    const [sorting, setSorting] = useState<SortingState>([]);
    const [rowSelection, setRowSelection] = useState({});
    // const [contractAmounts, setContractAmounts] = useState<{
    //   [key: string]: number;
    // }>({});

    // 1. Tracks which specific line is "active" in the edit pop-out
    const [editingData, setEditingData] = useState<PurchaseOrderLine | null>(null);

    // 2. (Optional) Tracks draft amounts to show in the UI before DB save
    const [contractAmounts, setContractAmounts] = useState<Record<string, number>>({});

    const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // 1. Extract the value from the form
        const formData = new FormData(e.currentTarget);
        const rawValue = formData.get("contractAmount");

        // 2. Ensure we have a valid row and a valid number
        if (editingData && rawValue !== null) {
            const newAmount = parseFloat(rawValue as string);

            if (!isNaN(newAmount)) {
                // 3. Update the local UI state using the Database ID
                // This ensures the table shows the new value immediately
                setContractAmounts((prev) => ({
                    ...prev,
                    [editingData.id]: newAmount,
                }));

                // 4. MAPPING TO BACKEND:
                // This is where you'd call your server action or API
                console.log(`Ready to save to Backend: 
        Target Table: PurchaseOrderLine
        Record ID: ${editingData.id} 
        New Amount: ${newAmount}`);

                // 5. Close the Pop-out
                setEditingData(null);
            }
        }
    };

    const columns = useMemo<ColumnDef<PurchaseOrderLine>[]>(
        () => [
            {
                accessorKey: "duid",
                header: ({ column }) => <SortableHeader column={column} title="DUID" />,
                cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("duid")}</span>,
                size: 120,
            },
            {
                accessorKey: "poNumber",
                header: ({ column }) => <SortableHeader column={column} title="PO Number" />,
                cell: ({ row }) => <span className="font-mono text-xs text-primary">{row.getValue("poNumber")}</span>,
                size: 50,
            },
            {
                accessorKey: "projectCode",
                header: ({ column }) => <SortableHeader column={column} title="Project Code" />,
                cell: ({ row }) => <span className="font-mono text-xs">{row.getValue("projectCode")}</span>,
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
                size: 80,
            },
            {
                accessorKey: "poLineNumber",
                header: ({ column }) => <SortableHeader column={column} title="Line" />,
                cell: ({ row }) => <span className="text-xs text-center block">{row.getValue("poLineNumber")}</span>,
                size: 50,
            },
            {
                accessorKey: "poType",
                header: ({ column }) => <SortableHeader column={column} title="PO Type" />,
                cell: ({ row }) => (
                    <span className="text-xs px-1.5 py-0.5 bg-secondary rounded text-secondary-foreground">{row.getValue("poType")}</span>
                ),
                size: 80,
            },
            {
                accessorKey: "unitPrice",
                header: ({ column }) => <SortableHeader column={column} title="Unit Price" />,
                cell: ({ row }) => <span className="text-xs font-mono text-right block">{formatCurrency(row.getValue("unitPrice"))}</span>,
                size: 100,
            },
            {
                accessorKey: "requestedQuantity",
                header: ({ column }) => <SortableHeader column={column} title="Qty" />,
                cell: ({ row }) => <span className="text-xs text-center block">{row.getValue("requestedQuantity")}</span>,
                size: 50,
            },
            {
                accessorKey: "poLineAmount",
                header: ({ column }) => <SortableHeader column={column} title="PO Line Amount" />,
                cell: ({ row }) => (
                    <span className="text-xs font-mono text-right block font-medium text-primary">
                        {formatCurrency(row.getValue("poLineAmount"))}
                    </span>
                ),
                size: 100,
            },
            {
                id: "select",
                header: ({ table }) => (
                    <input
                        type="checkbox"
                        // If all rows on current page are checked, this shows checked
                        checked={table.getIsAllPageRowsSelected()}
                        // If only some are checked, this shows a "dash" (horizontal line)
                        ref={(el) => {
                            if (el) el.indeterminate = table.getIsSomePageRowsSelected();
                        }}
                        // Clicking this toggles everything except the header
                        onChange={table.getToggleAllPageRowsSelectedHandler()}
                    />
                ),
                cell: ({ row }) => (
                    <input
                        type="checkbox"
                        // Is this specific data row selected?
                        checked={row.getIsSelected()}
                        // Standard click handler
                        onChange={row.getToggleSelectedHandler()}
                    />
                ),
                size: 20,
            },

            {
                accessorKey: "itemDescription",
                header: ({ column }) => <SortableHeader column={column} title="Item Description" />,
                cell: ({ row }) => (
                    <span className="text-xs truncate max-w-50 block" title={row.getValue("itemDescription")}>
                        {row.getValue("itemDescription")}
                    </span>
                ),
                size: 140,
            },
            {
                id: "contractAmount",
                header: "Contract Amount",
                cell: ({ row }) => {
                    // row.id is now your database ID
                    const dbId = row.id;
                    const currentAmount = contractAmounts[dbId] ?? 0;

                    return (
                        <div className="flex justify-end">
                            <button
                                className="text-xs font-mono px-2 py-1 rounded hover:bg-gray-100 transition-colors border border-transparent hover:border-gray-200"
                                onClick={() => setEditingData(row.original)} // Pass whole row to modal/popover
                            >
                                {currentAmount > 0 ? formatCurrency(currentAmount) : "Set Amount"}
                            </button>
                        </div>
                    );
                },
                size: 100,
            },

            {
                accessorKey: "status",
                header: ({ column }) => <SortableHeader column={column} title="Status" />,
                cell: ({ row }) => {
                    const [status, setStatus] = useState(row.getValue("status") as string);

                    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
                        setStatus(e.target.value);
                        // TODO: You can propagate this change to your backend or parent state later
                    };

                    const statusClasses = status === "Invoiced" ? "bg-green-150 text-green-600" : "bg-red-150 text-red-600"; // Not Invoiced = red, Invoiced = green

                    return (
                        <select value={status} onChange={handleChange} className={`text-xs px-0 py-0 rounded ${statusClasses}`}>
                            <option value="Not Invoiced">Not Invoiced</option>
                            <option value="Invoiced">Invoiced</option>
                        </select>
                    );
                },
                size: 80,
            },
        ],
        [],
    );

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            rowSelection,
        },
        onSortingChange: setSorting,
        onRowSelectionChange: setRowSelection, // Update your state when clicked
        getRowId: (row) => row.id, // Replace 'id' with your actual DB primary key field
        enableRowSelection: true,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
    });

    return (
        <div className="flex-1 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-1">
                <table className="w-full border-collapse min-w-300">
                    <thead className="sticky top-0 z-10">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="bg-gray-300">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-3 py-2 text-left text-xs font-bold text-secondary-foreground border-b border-r border-border last:border-r-0"
                                        style={{ width: header.getSize() }}
                                    >
                                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-muted-foreground bg-card">
                                    No purchase order lines match your filters
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row, index) => (
                                <tr
                                    key={row.id}
                                    className={`
                    ${index % 2 === 0 ? "bg-card" : "bg-card/50"}
                    hover:bg-accent/50 transition-colors
                  `}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td
                                            key={cell.id}
                                            className="px-3 py-2 border-b border-r border-border last:border-r-0 text-foreground"
                                        >
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {editingData && (
                <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-400 border shadow-2xl rounded-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-4 border-b bg-muted/30">
                            <h3 className="text-sm font-bold uppercase tracking-tight">Edit Contract</h3>
                            <p className="text-[10px] font-mono text-blue-500 mt-1">DB ID: {editingData.id}</p>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSave} className="p-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                                        Contract Amount (NGN)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
                                        <input
                                            name="contractAmount"
                                            type="number"
                                            step="0.01"
                                            required
                                            autoFocus
                                            defaultValue={contractAmounts[editingData.id] ?? editingData.poLineAmount ?? 0}
                                            className="w-full pl-8 pr-3 py-2 bg-background border rounded-md text-sm outline-none focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingData(null)}
                                    className="px-3 py-1.5 text-xs font-medium hover:bg-accent rounded-md transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md shadow-sm hover:opacity-90"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

function SortableHeader({
    column,
    title,
}: {
    column: {
        getIsSorted: () => false | "asc" | "desc";
        toggleSorting: (desc?: boolean) => void;
    };
    title: string;
}) {
    const sorted = column.getIsSorted();

    return (
        <button
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="flex items-center gap-1 hover:text-foreground transition-colors group"
        >
            <span>{title}</span>
            {sorted === "asc" ? (
                <ArrowUp className="h-3 w-3" />
            ) : sorted === "desc" ? (
                <ArrowDown className="h-3 w-3" />
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
            )}
        </button>
    );
}
