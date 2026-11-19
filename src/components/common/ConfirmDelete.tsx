import { Trash2 } from "lucide-react";

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
import { Button } from "@/components/ui/button";

export function ConfirmDelete({
  itemLabel,
  onConfirm,
  triggerLabel = "মুছুন",
  description,
}: {
  itemLabel: string;
  onConfirm: () => void;
  triggerLabel?: string;
  description?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={`${itemLabel} মুছুন`} className="text-destructive hover:text-destructive">
          <Trash2 />
          {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>“{itemLabel}” মুছে ফেলবেন?</AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? "এটি এই ডিভাইস থেকে স্থায়ীভাবে মুছে যাবে। আগে এক্সপোর্ট করে রাখতে পারেন।"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>বাতিল</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            হ্যাঁ, মুছুন
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
