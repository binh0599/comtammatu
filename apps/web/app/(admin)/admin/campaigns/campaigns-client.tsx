"use client";

import { useState, useEffect, useTransition } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Send,
  CalendarClock,
  Megaphone,
  FileText,
  Clock,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  scheduleCampaign,
  sendCampaign,
  getCampaignAnalytics,
} from "./actions";
import type { CampaignAnalytics } from "./actions";

// =====================
// Types
// =====================

interface Campaign {
  id: number;
  tenant_id: number;
  name: string;
  type: string;
  target_segment: Record<string, unknown> | null;
  content: { subject?: string; body?: string; cta_url?: string } | null;
  scheduled_at: string | null;
  sent_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

// =====================
// Label helpers
// =====================

function getTypeLabel(type: string): string {
  switch (type) {
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    case "push":
      return "Thông báo đẩy";
    default:
      return type;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Nháp";
    case "scheduled":
      return "Đã lên lịch";
    case "sent":
      return "Đã gửi";
    case "completed":
      return "Hoàn tất";
    default:
      return status;
  }
}

function getStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "draft":
      return "secondary";
    case "scheduled":
      return "outline";
    case "sent":
      return "default";
    case "completed":
      return "default";
    default:
      return "secondary";
  }
}

function getTypeVariant(
  type: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (type) {
    case "email":
      return "default";
    case "sms":
      return "outline";
    case "push":
      return "secondary";
    default:
      return "secondary";
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(dateStr));
}

// =====================
// Stats Cards
// =====================

function StatsCards({ campaigns }: { campaigns: Campaign[] }) {
  const total = campaigns.length;
  const draft = campaigns.filter((c) => c.status === "draft").length;
  const scheduled = campaigns.filter((c) => c.status === "scheduled").length;
  const sent = campaigns.filter(
    (c) => c.status === "sent" || c.status === "completed",
  ).length;

  const cards = [
    {
      title: "Tổng chiến dịch",
      value: total,
      icon: Megaphone,
    },
    {
      title: "Bản nháp",
      value: draft,
      icon: FileText,
    },
    {
      title: "Đã lên lịch",
      value: scheduled,
      icon: Clock,
    },
    {
      title: "Đã gửi",
      value: sent,
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =====================
// Create / Edit Dialog
// =====================

function CampaignFormDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign?: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  const isEditing = !!campaign;
  const segment = (campaign?.target_segment ?? {}) as {
    loyalty_tier_ids?: number[];
    min_total_spent?: number;
    min_visits?: number;
    gender?: string;
  };
  const content = (campaign?.content ?? {}) as {
    subject?: string;
    body?: string;
    cta_url?: string;
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const input = {
      name: form.get("name") as string,
      type: form.get("type") as string,
      content: {
        subject: (form.get("subject") as string) || undefined,
        body: form.get("body") as string,
        cta_url: (form.get("cta_url") as string) || undefined,
      },
      target_segment: {
        min_total_spent: form.get("min_total_spent")
          ? Number(form.get("min_total_spent"))
          : undefined,
        min_visits: form.get("min_visits")
          ? Number(form.get("min_visits"))
          : undefined,
        gender: ((g) => g && g !== "ALL" ? g : undefined)(form.get("gender") as string),
      },
    };

    startTransition(async () => {
      const result = isEditing
        ? await updateCampaign(campaign.id, input)
        : await createCampaign(input);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Chỉnh sửa chiến dịch" : "Tạo chiến dịch mới"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cập nhật thông tin chiến dịch"
              : "Điền thông tin để tạo chiến dịch marketing"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="name">Tên chiến dịch</Label>
              <Input
                id="name"
                name="name"
                placeholder="VD: Khuyến mãi cuối tuần"
                defaultValue={campaign?.name ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Loại</Label>
              <Select name="type" defaultValue={campaign?.type ?? "email"}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Chọn loại chiến dịch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Thông báo đẩy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Tiêu đề</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Tiêu đề email/thông báo"
                defaultValue={content.subject ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Nội dung</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Nội dung chiến dịch..."
                rows={4}
                defaultValue={content.body ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cta_url">Liên kết CTA</Label>
              <Input
                id="cta_url"
                name="cta_url"
                placeholder="https://..."
                defaultValue={content.cta_url ?? ""}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Đối tượng mục tiêu
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label htmlFor="min_total_spent" className="text-xs">
                    Chi tiêu tối thiểu
                  </Label>
                  <Input
                    id="min_total_spent"
                    name="min_total_spent"
                    type="number"
                    min={0}
                    placeholder="0"
                    defaultValue={segment.min_total_spent ?? ""}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="min_visits" className="text-xs">
                    Số lần ghé tối thiểu
                  </Label>
                  <Input
                    id="min_visits"
                    name="min_visits"
                    type="number"
                    min={0}
                    placeholder="0"
                    defaultValue={segment.min_visits ?? ""}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="gender" className="text-xs">
                    Giới tính
                  </Label>
                  <Select
                    name="gender"
                    defaultValue={segment.gender ?? "ALL"}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Tất cả" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Tất cả</SelectItem>
                      <SelectItem value="M">Nam</SelectItem>
                      <SelectItem value="F">Nữ</SelectItem>
                      <SelectItem value="Other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Đang lưu..."
                  : "Đang tạo..."
                : isEditing
                  ? "Lưu thay đổi"
                  : "Tạo chiến dịch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================
// Schedule Dialog
// =====================

function ScheduleDialog({
  campaign,
  open,
  onOpenChange,
}: {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const datetimeLocal = form.get("scheduled_at") as string;

    if (!datetimeLocal) {
      setError("Vui lòng chọn thời gian");
      return;
    }

    // Convert datetime-local to ISO string
    const scheduledAt = new Date(datetimeLocal).toISOString();

    startTransition(async () => {
      const result = await scheduleCampaign(campaign.id, scheduledAt);
      if (result.error) {
        setError(result.error);
      } else {
        setError(null);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lên lịch gửi</DialogTitle>
          <DialogDescription>
            Chọn thời gian gửi chiến dịch &quot;{campaign.name}&quot;
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="scheduled_at">Thời gian gửi</Label>
              <Input
                id="scheduled_at"
                name="scheduled_at"
                type="datetime-local"
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang xử lý..." : "Lên lịch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =====================
// Main Component
// =====================

export function CampaignsClient({ campaigns }: { campaigns: Campaign[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<Campaign | null>(null);
  const [scheduleCampaignItem, setScheduleCampaignItem] =
    useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [analyticsData, setAnalyticsData] = useState<CampaignAnalytics | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  async function handleDelete(id: number) {
    const key = `delete-${id}`;
    if (processingIds.has(key)) return;
    setProcessingIds((prev) => new Set(prev).add(key));
    startTransition(async () => {
      try {
        const result = await deleteCampaign(id);
        if (result.error) setError(result.error);
        else setError(null);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    });
  }

  async function handleSend(id: number) {
    const key = `send-${id}`;
    if (processingIds.has(key)) return;
    setProcessingIds((prev) => new Set(prev).add(key));
    startTransition(async () => {
      try {
        const result = await sendCampaign(id);
        if (result.error) setError(result.error);
        else setError(null);
      } finally {
        setProcessingIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    });
  }

  async function handleShowAnalytics(campaignId: number) {
    setAnalyticsLoading(true);
    setAnalyticsOpen(true);
    setAnalyticsData(null);
    try {
      const data = await getCampaignAnalytics(campaignId);
      setAnalyticsData(data);
    } catch {
      setError("Không thể tải dữ liệu phân tích");
    } finally {
      setAnalyticsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <StatsCards campaigns={campaigns} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chiến dịch</h2>
          <p className="text-muted-foreground">
            Quản lý chiến dịch marketing cho nhà hàng
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Tạo chiến dịch
        </Button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Tên</TableHead>
              <TableHead scope="col">Loại</TableHead>
              <TableHead scope="col">Trạng thái</TableHead>
              <TableHead scope="col" className="text-right">
                Đã gửi
              </TableHead>
              <TableHead scope="col">Lịch gửi</TableHead>
              <TableHead scope="col">Ngày tạo</TableHead>
              <TableHead scope="col" className="text-right">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  Chưa có chiến dịch nào
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    {campaign.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getTypeVariant(campaign.type)}>
                      {getTypeLabel(campaign.type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {campaign.sent_count}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(campaign.scheduled_at)}
                  </TableCell>
                  <TableCell>
                    {formatDateTime(campaign.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* Edit — only draft/scheduled */}
                      {(campaign.status === "draft" ||
                        campaign.status === "scheduled") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditCampaign(campaign)}
                          disabled={isPending}
                          aria-label="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      )}

                      {/* Schedule — only draft */}
                      {campaign.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setScheduleCampaignItem(campaign)}
                          disabled={isPending}
                          aria-label="Lên lịch"
                        >
                          <CalendarClock
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Button>
                      )}

                      {/* Send — only scheduled */}
                      {campaign.status === "scheduled" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={isPending}
                              aria-label="Gửi ngay"
                            >
                              <Send
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Gửi chiến dịch
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn gửi chiến dịch &quot;
                                {campaign.name}&quot; ngay bây giờ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSend(campaign.id)}
                              >
                                Gửi ngay
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Analytics — only sent/completed */}
                      {(campaign.status === "sent" ||
                        campaign.status === "completed") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleShowAnalytics(campaign.id)}
                          disabled={isPending}
                          aria-label="Xem phân tích"
                        >
                          <BarChart3
                            className="h-4 w-4"
                            aria-hidden="true"
                          />
                        </Button>
                      )}

                      {/* Delete — only draft */}
                      {campaign.status === "draft" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Xóa chiến dịch"
                            >
                              <Trash2
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Xóa chiến dịch
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Bạn có chắc muốn xóa chiến dịch &quot;
                                {campaign.name}&quot;? Hành động này không
                                thể hoàn tác.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Hủy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(campaign.id)}
                              >
                                Xóa
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <CampaignFormDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Edit Dialog */}
      {editCampaign && (
        <CampaignFormDialog
          campaign={editCampaign}
          open={!!editCampaign}
          onOpenChange={(open) => {
            if (!open) setEditCampaign(null);
          }}
        />
      )}

      {/* Schedule Dialog */}
      {scheduleCampaignItem && (
        <ScheduleDialog
          campaign={scheduleCampaignItem}
          open={!!scheduleCampaignItem}
          onOpenChange={(open) => {
            if (!open) setScheduleCampaignItem(null);
          }}
        />
      )}

      {/* Analytics Dialog */}
      <Dialog open={analyticsOpen} onOpenChange={setAnalyticsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Phân tích chiến dịch</DialogTitle>
            <DialogDescription>
              Thống kê hiệu quả gửi và chuyển đổi
            </DialogDescription>
          </DialogHeader>
          {analyticsLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground text-sm">Đang tải...</p>
            </div>
          ) : analyticsData ? (
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground text-xs">Đã gửi</p>
                  <p className="text-2xl font-bold">{analyticsData.total_sent}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground text-xs">Đã mở</p>
                  <p className="text-2xl font-bold">{analyticsData.total_opened}</p>
                  <p className="text-muted-foreground text-xs">{analyticsData.open_rate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground text-xs">Chuyển đổi</p>
                  <p className="text-2xl font-bold">{analyticsData.total_converted}</p>
                  <p className="text-muted-foreground text-xs">{analyticsData.conversion_rate}%</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground text-xs">Doanh thu</p>
                  <p className="text-2xl font-bold">
                    {analyticsData.conversion_revenue.toLocaleString("vi-VN")}đ
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                Chưa có dữ liệu phân tích
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
