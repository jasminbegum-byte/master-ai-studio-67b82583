import { toast } from "sonner";

/** Run a storage write and surface success/failure in Bengali. Returns true on success. */
export function safeSave(action: () => void, successMessage?: string): boolean {
  try {
    action();
    if (successMessage) toast.success(successMessage);
    return true;
  } catch (error) {
    console.error(error);
    toast.error("সংরক্ষণ করা যায়নি", {
      description: "ব্রাউজারের স্টোরেজ পূর্ণ বা বন্ধ থাকতে পারে। পুরনো ডেটা এক্সপোর্ট করে মুছে আবার চেষ্টা করুন।",
    });
    return false;
  }
}
