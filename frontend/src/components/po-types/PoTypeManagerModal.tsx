import { useState } from "react";
import { X, Plus, Tag, Loader2, Trash2 } from "lucide-react";
import { usePoTypes, useCreatePoType, useDeactivatePoType } from "@/hooks/po-types/usePoTypes";

interface PoTypeManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PoTypeManagerModal({ isOpen, onClose }: PoTypeManagerModalProps) {
  const { data: poTypes, isLoading } = usePoTypes();
  const createMutation = useCreatePoType();
  const deactivateMutation = useDeactivatePoType();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) return;

    createMutation.mutate(
      { name: name.trim(), description: description.trim() },
      {
        onSuccess: () => {
          setName("");
          setDescription("");
        },
      },
    );
  };

  const activeTypes = poTypes?.filter((t) => t.isActive) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Tag size={16} />
            </div>
            <h2 className="text-sm font-black text-slate-900">Manage PO Types</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Add form */}
        <form onSubmit={handleSubmit} className="p-5 border-b border-slate-100 space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emergency Response"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this PO type covers..."
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
          <button
            type="submit"
            disabled={createMutation.isPending || !name.trim() || !description.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-black uppercase tracking-wider bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add PO Type
          </button>
        </form>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
            Active PO Types ({activeTypes.length})
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : activeTypes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No PO types yet.</p>
          ) : (
            activeTypes.map((type) => (
              <div
                key={type.id}
                className="flex items-start justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50"
              >
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-800">{type.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{type.description}</p>
                </div>
                <button
                  onClick={() => {
                    if (confirm(`Deactivate "${type.name}"? It will no longer be selectable for new imports.`)) {
                      deactivateMutation.mutate(type.id);
                    }
                  }}
                  disabled={deactivateMutation.isPending}
                  className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Deactivate"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}