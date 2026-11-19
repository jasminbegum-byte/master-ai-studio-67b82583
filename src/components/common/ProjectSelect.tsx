import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { projects } from "@/lib/store/collections";

const NONE = "__none__";

export function ProjectSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string | null;
  onChange: (projectId: string | null) => void;
}) {
  const list = projects.useAll();
  const known = value && list.some((p) => p.id === value) ? value : NONE;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>প্রজেক্টের সাথে যুক্ত করুন (ঐচ্ছিক)</Label>
      <Select value={known} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger id={id} className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>কোনো প্রজেক্ট নয়</SelectItem>
          {list.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function useProjectTitle() {
  const list = projects.useAll();
  return (id: string | null) => (id ? (list.find((p) => p.id === id)?.title ?? null) : null);
}
