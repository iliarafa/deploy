import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StickyNote, Plus, X, Trash2, Pin, PinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { type QuickNote } from "@shared/schema";
import { format } from "date-fns";

export default function QuickNotes() {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");

  const { data: notes = [], isLoading } = useQuery<QuickNote[]>({
    queryKey: ["/api/quick-notes"],
    enabled: isAuthenticated,
  });

  const createNoteMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest("POST", "/api/quick-notes", { content });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      setNewNote("");
      toast({
        title: "Note Added",
        description: "Your quick note has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: { content?: string; isPinned?: boolean } }) => {
      const response = await apiRequest("PATCH", `/api/quick-notes/${id}`, updates);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      setEditingNoteId(null);
      setEditContent("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update your note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/quick-notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quick-notes"] });
      toast({
        title: "Note Deleted",
        description: "Your note has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete your note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAddNote = () => {
    if (newNote.trim()) {
      createNoteMutation.mutate(newNote.trim());
    }
  };

  const handleUpdateNote = (id: number) => {
    if (editContent.trim()) {
      updateNoteMutation.mutate({ id, updates: { content: editContent.trim() } });
    }
  };

  const handleTogglePin = (note: QuickNote) => {
    updateNoteMutation.mutate({ id: note.id, updates: { isPinned: !note.isPinned } });
  };

  const handleDeleteNote = (id: number) => {
    deleteNoteMutation.mutate(id);
  };

  const startEditing = (note: QuickNote) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditContent("");
  };

  if (!isAuthenticated) {
    return null;
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-24 right-4 md:bottom-6 z-40 h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
          aria-label="Quick Notes"
        >
          <StickyNote className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:w-96 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-primary" />
            Quick Notes
          </SheetTitle>
        </SheetHeader>
        
        <div className="p-4 border-b bg-gray-50 dark:bg-gray-900">
          <div className="space-y-2">
            <Textarea
              placeholder="Jot down a quick thought..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="min-h-[80px] resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleAddNote();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Ctrl+Enter to save</span>
              <Button
                size="sm"
                onClick={handleAddNote}
                disabled={!newNote.trim() || createNoteMutation.isPending}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : sortedNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <StickyNote className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-sm">Add your first quick note above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedNotes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${
                    note.isPinned
                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {editingNoteId === note.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="min-h-[60px] resize-none"
                        autoFocus
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={cancelEditing}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleUpdateNote(note.id)}
                          disabled={!editContent.trim() || updateNoteMutation.isPending}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        className="text-sm whitespace-pre-wrap cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1 -m-1"
                        onClick={() => startEditing(note)}
                      >
                        {note.content}
                      </p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-xs text-gray-400">
                          {note.createdAt && format(new Date(note.createdAt), "MMM d, h:mm a")}
                        </span>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleTogglePin(note)}
                          >
                            {note.isPinned ? (
                              <PinOff className="h-3.5 w-3.5 text-yellow-600" />
                            ) : (
                              <Pin className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => handleDeleteNote(note.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
