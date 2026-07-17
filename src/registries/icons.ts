import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Boxes,
  CheckCircle2,
  CheckSquare,
  Columns3,
  Database,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const iconRegistry = {
  alertTriangle: AlertTriangle,
  arrowRight: ArrowRight,
  bookOpen: BookOpen,
  boxes: Boxes,
  checkCircle: CheckCircle2,
  checkSquare: CheckSquare,
  columns: Columns3,
  database: Database,
  fileText: FileText,
  folderKanban: FolderKanban,
  gauge: Gauge,
  layoutDashboard: LayoutDashboard,
  lightbulb: Lightbulb,
  logOut: LogOut,
  refresh: RefreshCcw,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
} as const;

export type IconName = keyof typeof iconRegistry;
export const iconNames = Object.keys(iconRegistry) as [IconName, ...IconName[]];

