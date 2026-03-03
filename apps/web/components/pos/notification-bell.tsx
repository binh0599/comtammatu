"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatElapsedTime } from "@comtammatu/shared";
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllRead,
} from "@/app/(pos)/pos/notifications/actions";

interface Notification {
    id: number;
    title: string;
    body: string | null;
    data: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
    channel: string;
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const fetchData = useCallback(async () => {
        try {
            const [notifs, count] = await Promise.all([
                getNotifications(),
                getUnreadCount(),
            ]);
            setNotifications(notifs as Notification[]);
            setUnreadCount(count as number);
        } catch {
            // silently fail — non-critical UI
        }
    }, []);

    // Fetch on mount and periodically
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000); // poll every 15s
        return () => clearInterval(interval);
    }, [fetchData]);

    // Refetch when popover opens
    useEffect(() => {
        if (isOpen) fetchData();
    }, [isOpen, fetchData]);

    function handleMarkRead(id: number) {
        startTransition(async () => {
            await markNotificationRead(id);
            setNotifications((prev) =>
                prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
            );
            setUnreadCount((prev) => Math.max(0, prev - 1));
        });
    }

    function handleMarkAllRead() {
        startTransition(async () => {
            await markAllRead();
            setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
            setUnreadCount(0);
        });
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ""}`}
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <Badge
                            variant="destructive"
                            className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-[10px]"
                        >
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-80 p-0"
                align="end"
                sideOffset={8}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <h3 className="text-sm font-semibold">Thông báo</h3>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto gap-1 px-2 py-1 text-xs"
                            onClick={handleMarkAllRead}
                            disabled={isPending}
                        >
                            <CheckCheck className="h-3 w-3" />
                            Đọc tất cả
                        </Button>
                    )}
                </div>

                {/* Notification List */}
                <ScrollArea className="max-h-[320px]">
                    {notifications.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">
                            Không có thông báo
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    type="button"
                                    onClick={() => {
                                        if (!notif.is_read) handleMarkRead(notif.id);
                                    }}
                                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${!notif.is_read ? "bg-primary/5" : ""
                                        }`}
                                >
                                    {/* Unread dot */}
                                    <div className="mt-1.5 flex-shrink-0">
                                        {!notif.is_read ? (
                                            <div className="h-2 w-2 rounded-full bg-primary" />
                                        ) : (
                                            <Check className="h-3 w-3 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium leading-tight">
                                            {notif.title}
                                        </p>
                                        {notif.body && (
                                            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                                {notif.body}
                                            </p>
                                        )}
                                        <p className="mt-1 text-[10px] text-muted-foreground">
                                            {formatElapsedTime(notif.created_at)}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
