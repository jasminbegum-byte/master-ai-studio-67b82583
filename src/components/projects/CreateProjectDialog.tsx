import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";

import { FieldError } from "@/components/common/FieldError";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_LABELS } from "@/lib/domain/labels";
import { createInitialStages, INITIAL_APPROVAL } from "@/lib/domain/production";
import { newId, nowIso, projects } from "@/lib/store/collections";
import { safeSave } from "@/lib/store/safe-save";
import type { Platform } from "@/lib/store/types";

export function CreateProjectDialog({ triggerVariant = "hero" }: { triggerVariant?: "hero" | "studio" }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [platform, setPlatform] = useState<Platform>("facebook_reels");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 2) {
      setError("প্রজেক্টের নাম কমপক্ষে ২ অক্ষরের হতে হবে।");
      return;
    }
    const at = nowIso();
    const id = newId();
    const ok = safeSave(
      () =>
        projects.upsert({
          id,
          title: title.trim(),
          description: description.trim(),
          platform,
          isExample: false,
          createdAt: at,
          updatedAt: at,
          stages: createInitialStages(at),
          approval: INITIAL_APPROVAL,
        }),
      "নতুন প্রজেক্ট তৈরি হয়েছে",
    );
    if (!ok) return;
    setOpen(false);
    setTitle("");
    setDescription("");
    setError(null);
    navigate({ to: "/monitor", search: { project: id } });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant}>
          <Plus />
          নতুন প্রজেক্ট
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={submit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle className="font-display">নতুন প্রজেক্ট</DialogTitle>
            <DialogDescription>প্রজেক্টটি এই ডিভাইসে খসড়া হিসেবে সংরক্ষিত হবে।</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="np-title">প্রজেক্টের নাম *</Label>
            <Input
              id="np-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="যেমন: গ্রামের ভূতের গল্প — পর্ব ১"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "np-title-err" : undefined}
              autoFocus
            />
            <FieldError id="np-title-err" message={error} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-platform">প্ল্যাটফর্ম</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as Platform)}>
              <SelectTrigger id="np-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM_LABELS) as Platform[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="np-desc">সংক্ষিপ্ত বিবরণ</Label>
            <Textarea
              id="np-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="ভিডিওটি কী নিয়ে?"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              বাতিল
            </Button>
            <Button type="submit">তৈরি করুন</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
