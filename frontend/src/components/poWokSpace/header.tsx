import { ImportPOButton } from "@/features/poWorkspace/ImportButton";
import { FileSpreadsheet, Building2 } from "lucide-react";
import { NavLink } from "react-router-dom";

export function Header() {
    return (
        <header className="bg-card border-b border-border">
            <div className="px-2 py-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileSpreadsheet className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-sm font-semibold text-foreground">PO Finance Tracking</h1>
                            <p className="text-sm text-accent-foreground">Purchase Order Workspace</p>
                        </div>
                    </div>
                </div>

                {/* Quick menus */}
                <nav className="flex items-center gap-6 text-sm font-bold">
                    <NavLink
                        to="/po-aging-days"
                        className={({ isActive }) =>
                            isActive
                                ? "text-primary border-b-2 border-primary pb-1"
                                : "text-accent-foreground hover:text-primary transition-colors"
                        }
                    >
                        PO Aging
                    </NavLink>
                    <NavLink
                        to="/workspace"
                        className={({ isActive }) =>
                            isActive
                                ? "text-primary border-b-2 border-primary pb-1"
                                : "text-accent-foreground hover:text-primary transition-colors"
                        }
                    >
                        PO Workspace
                    </NavLink>
                    <NavLink
                        to="/create-account"
                        className={({ isActive }) =>
                            isActive
                                ? "text-primary border-b-2 border-primary pb-1"
                                : "text-accent-foreground hover:text-primary transition-colors"
                        }
                    >
                        Create Staff Account
                    </NavLink>
                    <NavLink
                        to="/admin/fund-requests"
                        className={({ isActive }) =>
                            isActive
                                ? "text-primary border-b-2 border-primary pb-1"
                                : "text-accent-foreground hover:text-primary transition-colors"
                        }
                    >
                        Fund Request
                    </NavLink>
                    {/* Add more links here later */}
                    <ImportPOButton />
                </nav>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>Stecam Operations</span>
                    </div>
                    <div className="h-4 w-px bg-border" />
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center text-xs font-medium text-foreground">
                            AD
                        </div>
                        <span className="text-sm font-bold text-muted-foreground">Admin</span>
                    </div>
                </div>
            </div>
        </header>
    );
}
