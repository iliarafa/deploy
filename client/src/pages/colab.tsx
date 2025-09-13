import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, Send, MessageSquare, Users, Clock } from "lucide-react";
import TextHighlighter from "@/components/search/text-highlighter";
import { filterMessages, countSearchMatches } from "@/components/search/search-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import type { ColabMessage } from "@shared/schema";

export default function Colab() {
  const [searchTerm, setSearchTerm] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all messages
  const { data: messages = [], isLoading } = useQuery<ColabMessage[]>({
    queryKey: ["/api/colab-messages"],
  });

  // Create message mutation
  const createMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("/api/colab-messages", {
        method: "POST",
        body: { content },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/colab-messages"] });
      setMessageContent("");
      toast({
        title: "Message sent",
        description: "Your message has been posted to the discussion.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter messages based on search
  const filteredMessages = searchTerm.trim() 
    ? filterMessages(messages, searchTerm, { searchInUsername: true })
    : messages;

  const searchMatchCount = searchTerm.trim() 
    ? countSearchMatches(messages, searchTerm, { searchInUsername: true })
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;
    createMessageMutation.mutate(messageContent.trim());
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex items-center space-x-3 mb-4">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white" data-testid="text-colab-title">
              Team Collaboration
            </h1>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span data-testid="text-total-messages">{messages.length} messages</span>
            </div>
            {searchTerm && (
              <div className="flex items-center space-x-1">
                <Search className="w-4 h-4" />
                <span data-testid="text-search-results">
                  {searchMatchCount} matches in {filteredMessages.length} messages
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search messages and usernames..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            {searchTerm && (
              <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                <Badge variant="outline" data-testid="badge-search-results">
                  {filteredMessages.length} of {messages.length} messages
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Form */}
        {user && (
          <Card>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Textarea
                    placeholder="Share your thoughts with the team..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="min-h-[100px] resize-none"
                    data-testid="textarea-message"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Posting as <strong data-testid="text-current-user">{user.username}</strong>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={!messageContent.trim() || createMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {createMessageMutation.isPending ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Messages Thread */}
        <div className="space-y-4">
          {filteredMessages.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {searchTerm ? "No messages found" : "No messages yet"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400" data-testid="text-no-messages">
                  {searchTerm 
                    ? `No messages match "${searchTerm}". Try a different search term.`
                    : "Be the first to start the conversation!"
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredMessages.map((message) => (
              <Card key={message.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-medium text-sm">
                        {message.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <TextHighlighter
                          text={message.username}
                          searchTerm={searchTerm}
                          className="font-medium text-gray-900 dark:text-white"
                          data-testid={`text-username-${message.id}`}
                        />
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="w-3 h-3" />
                          <span data-testid={`text-timestamp-${message.id}`}>
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-700 dark:text-gray-300">
                        <TextHighlighter
                          text={message.content}
                          searchTerm={searchTerm}
                          data-testid={`text-content-${message.id}`}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Scroll to bottom spacer */}
        <div className="h-16"></div>
      </div>
    </div>
  );
}