import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Home, Plus, Archive, Users, User, LogOut } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function BottomNav({
  current, onChange, avatarUrl, displayName, pendingRequests,
}: {
  current: string;
  onChange: (v: string) => void;
  avatarUrl: string | null;
  displayName: string | null;
  pendingRequests: number;
}) {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const items = [
    { key: "home", label: "Avaleht", Icon: Home },
    { key: "add", label: "Lisa", Icon: Plus },
    { key: "archive", label: "Arhiiv", Icon: Archive },
    { key: "friends", label: "Sõbrad", Icon: Users, badge: pendingRequests },
    { key: "profile", label: "Profiil", Icon: User },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur-md flex items-stretch justify-around pb-[env(safe-area-inset-bottom)] z-40">
        {items.map(({ key, label, Icon, badge }) => {
          const active = current === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className="relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 cursor-pointer bg-transparent border-none transition-colors active:scale-95 duration-150"
              style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            >
              <div className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                {badge && badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px]" style={{ fontWeight: active ? 700 : 500 }}>
                {label}
              </span>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-primary" />}
            </button>
          );
        })}
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 cursor-pointer bg-transparent border-none text-muted-foreground active:scale-95 transition-transform duration-150"
        >
          {avatarUrl ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
              <AvatarFallback className="text-[9px]">{(displayName || "?")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          ) : (
            <LogOut className="h-5 w-5" />
          )}
          <span className="text-[10px] font-medium">Välja</span>
        </button>
      </nav>

      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kas oled kindel, et soovid välja logida?</AlertDialogTitle>
            <AlertDialogDescription>Sinu sessioon lõpetatakse ja sind suunatakse sisselogimislehele.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tühista</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChange("logout")}>Jah, logi välja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
