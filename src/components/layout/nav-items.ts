import {
  Activity,
  Clapperboard,
  ImageIcon,
  LayoutDashboard,
  MessageSquareText,
  Scissors,
  ScrollText,
  Settings,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to:
    | "/"
    | "/assistant"
    | "/script"
    | "/characters"
    | "/animation"
    | "/editing"
    | "/thumbnail"
    | "/monitor"
    | "/settings";
  label: string;
  short: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "ড্যাশবোর্ড", short: "হোম", icon: LayoutDashboard },
  { to: "/assistant", label: "মিনি AI অ্যাসিস্ট্যান্ট", short: "অ্যাসিস্ট্যান্ট", icon: MessageSquareText },
  { to: "/script", label: "স্ক্রিপ্ট এজেন্ট", short: "স্ক্রিপ্ট", icon: ScrollText },
  { to: "/characters", label: "ক্যারেক্টার ক্রিয়েটর", short: "চরিত্র", icon: UserRound },
  { to: "/animation", label: "অ্যানিমেশন ইঞ্জিন", short: "অ্যানিমেশন", icon: Clapperboard },
  { to: "/editing", label: "এডিটিং এজেন্ট", short: "এডিটিং", icon: Scissors },
  { to: "/thumbnail", label: "থাম্বনেইল স্টুডিও", short: "থাম্বনেইল", icon: ImageIcon },
  { to: "/monitor", label: "প্রোডাকশন মনিটর", short: "মনিটর", icon: Activity },
  { to: "/settings", label: "সেটিংস", short: "সেটিংস", icon: Settings },
];

export const BOTTOM_NAV: NavItem["to"][] = ["/", "/script", "/assistant", "/monitor"];
