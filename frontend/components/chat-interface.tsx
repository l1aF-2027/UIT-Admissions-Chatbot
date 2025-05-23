"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askQuestion } from "@/lib/actions";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LinkPreview } from "./link-preview";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type TimingInfo = {
  retrievalTime: number;
  totalTime: number;
};

function renderers() {
  return {
    a: ({ href, children }: any) => <LinkPreview href={href as string} />,
    img: ({ src, alt, width, height }: any) => {
      // Xử lý đường dẫn ảnh
      let processedSrc = src?.replace(/\\+/g, "/");

      // Nếu là đường dẫn tương đối, thêm base path
      if (
        processedSrc &&
        !processedSrc.startsWith("http") &&
        !processedSrc.startsWith("/")
      ) {
        processedSrc = `/${processedSrc}`;
      }

      return (
        <img
          src={processedSrc}
          alt={alt || "Image"}
          width={width}
          height={height}
          style={{
            maxWidth: width ? `${width}px` : "100%",
            height: height ? `${height}px` : "auto",
            borderRadius: "8px",
            margin: "8px 0",
          }}
          onError={(e) => {
            // Fallback khi ảnh không load được
            const target = e.target as HTMLImageElement;
            target.style.display = "none";
            // Hoặc thay thế bằng placeholder
            // target.src = '/api/placeholder/300/200';
          }}
        />
      );
    },
  };
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timingInfo, setTimingInfo] = useState<TimingInfo | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Function to render message content with HTML support
  const renderMessageContent = (content: string) => {
    // Check if content contains HTML img tags
    if (content.includes("<img")) {
      return (
        <div
          dangerouslySetInnerHTML={{
            __html: content.replace(
              /<img\s+src="([^"]*)"(?:\s+alt="([^"]*)")?[^>]*>/g,
              '<img src="/$1" alt="$2" style="max-width: 300px; height: auto; border-radius: 8px; margin: 8px 0;" />'
            ),
          }}
        />
      );
    }

    // Otherwise use ReactMarkdown
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={renderers()}>
        {content}
      </ReactMarkdown>
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setTimingInfo(null);

    try {
      const response = await askQuestion(input);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.answer,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setTimingInfo({
        retrievalTime: response.retrievalTime,
        totalTime: response.totalTime,
      });
    } catch (error) {
      console.error("Error asking question:", error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Xin lỗi, đã xảy ra lỗi khi xử lý câu hỏi của bạn. Vui lòng thử lại sau.",
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-[500px] flex flex-col relative overflow-hidden">
      {/* Logo background */}
      <img
        src="/logo.png"
        alt="UIT Logo"
        className="absolute inset-0 w-[60%] h-[60%] object-contain opacity-10 pointer-events-none m-auto"
        style={{
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 0,
        }}
      />
      {/* Nội dung chat */}
      <div className="relative z-10 flex flex-col h-full">
        <CardHeader className="text-[#0A1172] rounded-t-lg flex flex-col justify-center">
          <CardTitle className="flex items-center text-lg font-semibold">
            <Bot className="mr-2 h-5 w-5" />
            Tư vấn tuyển sinh AI
          </CardTitle>
          <CardDescription className="text-blue-700 mt-1">
            Hỏi đáp thông tin tuyển sinh UIT
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 p-0 overflow-hidden">
          <ScrollArea className="h-full p-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <Bot className="h-12 w-12 mb-4 text-[#0A1172]" />
                <p className="mb-2 font-medium">
                  Chào mừng bạn đến với Tư vấn tuyển sinh UIT!
                </p>
                <p>
                  Hãy đặt câu hỏi về thông tin tuyển sinh, ngành học, hoặc bất kỳ
                  thông tin nào liên quan đến Trường Đại học Công nghệ Thông tin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        message.role === "user"
                          ? "bg-[#0A1172] text-white"
                          : "bg-gray-100 text-gray-800"
                      )}
                    >
                      {renderMessageContent(message.content)}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-gray-100 text-gray-800">
                      <Loader2 className="h-5 w-5 animate-spin" />
                    </div>
                  </div>
                )}
                {timingInfo && (
                  <div className="text-xs text-gray-500 italic">
                    Thời gian truy vấn: {timingInfo.retrievalTime.toFixed(2)}ms |
                    Tổng thời gian: {timingInfo.totalTime.toFixed(2)}ms
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>
        </CardContent>

        <CardFooter className="border-t">
          <form onSubmit={handleSubmit} className="flex w-full space-x-2">
            <Textarea
              placeholder="Nhập câu hỏi của bạn..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 resize-none min-h-[40px] max-h-[120px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || !input.trim()}
              className="bg-[#0A1172] hover:bg-blue-800"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <SendHorizontal className="h-5 w-5" />
              )}
              <span className="sr-only">Gửi</span>
            </Button>
          </form>
        </CardFooter>
      </div>
    </Card>
  );
}
