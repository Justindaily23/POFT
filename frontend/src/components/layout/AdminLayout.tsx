// layouts/AdminLayout.tsx
import { Header } from "@/components/poWokSpace/header";
import { Outlet } from "react-router-dom";

export function AdminLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header /> {/* persistent navigation */}
            <main className="flex-1 p-4">
                {" "}
                <Outlet />
            </main>
        </div>
    );
}
