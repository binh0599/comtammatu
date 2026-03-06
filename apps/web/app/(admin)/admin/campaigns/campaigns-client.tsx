"use client";

import { useState, useTransition } from "react";
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
} from "./actions";

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
      return "Thong bao day";
    default:
      return type;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "draft":
      return "Nhap";
    case "scheduled":
      return "Da len lich";
    case "sent":
      return "Da gui";
    case "completed":
      return "Hoan tat";
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
      title: "Tong chien dich",
      value: total,
      icon: Megaphone,
    },
    {
      title: "Ban nhap",
      value: draft,
      icon: FileText,
    },
    {
      title: "Da len lich",
      value: scheduled,
      icon: Clock,
    },
    {
      title: "Da gui",
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
        gender: (form.get("gender") as string) || undefined,
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
            {isEditing ? "Chinh sua chien dich" : "Tao chien dich moi"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Cap nhat thong tin chien dich"
              : "Dien thong tin de tao chien dich marketing"}
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
              <Label htmlFor="name">Ten chien dich</Label>
              <Input
                id="name"
                name="name"
                placeholder="VD: Khuyen mai cuoi tuan"
                defaultValue={campaign?.name ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Loai</Label>
              <Select name="type" defaultValue={campaign?.type ?? "email"}>
                <SelectTrigger>
                  <SelectValue placeholder="Chon loai chien dich" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="push">Thong bao day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Tieu de</Label>
              <Input
                id="subject"
                name="subject"
                placeholder="Tieu de email/thong bao"
                defaultValue={content.subject ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="body">Noi dung</Label>
              <Textarea
                id="body"
                name="body"
                placeholder="Noi dung chien dich..."
                rows={4}
                defaultValue={content.body ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cta_url">Lien ket CTA</Label>
              <Input
                id="cta_url"
                name="cta_url"
                placeholder="https://..."
                defaultValue={content.cta_url ?? ""}
              />
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">
                Doi tuong muc tieu
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1">
                  <Label htmlFor="min_total_spent" className="text-xs">
                    Chi tieu toi thieu
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
                    So lan ghe toi thieu
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
                    Gioi tinh
                  </Label>
                  <Select
                    name="gender"
                    defaultValue={segment.gender ?? ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tat ca" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Tat ca</SelectItem>
                      <SelectItem value="M">Nam</SelectItem>
                      <SelectItem value="F">Nu</SelectItem>
                      <SelectItem value="Other">Khac</SelectItem>
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
              Huy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? "Dang luu..."
                  : "Dang tao..."
                : isEditing
                  ? "Luu thay doi"
                  : "Tao chien dich"}
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const datetimeLocal = form.get("scheduled_at") as string;

    if (!datetimeLocal) {
      setError("Vui long chon thoi gian");
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
          <DialogTitle>Len lich gui</DialogTitle>
          <DialogDescription>
            Chon thoi gian gui chien dich &quot;{campaign.name}&quot;
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
              <Label htmlFor="scheduled_at">Thoi gian gui</Label>
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
              Huy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Dang xu ly..." : "Len lich"}
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

  async function handleDelete(id: number) {
    startTransition(async () => {
      const result = await deleteCampaign(id);
      if (result.error) setError(result.error);
      else setError(null);
    });
  }

  async function handleSend(id: number) {
    startTransition(async () => {
      const result = await sendCampaign(id);
      if (result.error) setError(result.error);
      else setError(null);
    });
  }

  return (
    <div className="space-y-4">
      <StatsCards campaigns={campaigns} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Chien dich</h2>
          <p className="text-muted-foreground">
            Quan ly chien dich marketing cho nha hang
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Tao chien dich
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
              <TableHead scope="col">Ten</TableHead>
              <TableHead scope="col">Loai</TableHead>
              <TableHead scope="col">Trang thai</TableHead>
              <TableHead scope="col" className="text-right">
                Da gui
              </TableHead>
              <TableHead scope="col">Lich gui</TableHead>
              <TableHead scope="col">Ngay tao</TableHead>
              <TableHead scope="col" className="text-right">
                Thao tac
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
                  Chua co chien dich nao
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
                          aria-label="Chinh sua"
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
                          aria-label="Len lich"
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
                              aria-label="Gui ngay"
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
                                Gui chien dich
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Ban co chac muon gui chien dich &quot;
                                {campaign.name}&quot; ngay bay gio?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Huy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleSend(campaign.id)}
                              >
                                Gui ngay
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      {/* Delete — only draft */}
                      {campaign.status === "draft" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Xoa chien dich"
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
                                Xoa chien dich
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Ban co chac muon xoa chien dich &quot;
                                {campaign.name}&quot;? Hanh dong nay khong
                                the hoan tac.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Huy</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(campaign.id)}
                              >
                                Xoa
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
    </div>
  );
}
