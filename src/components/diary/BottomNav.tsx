import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
    { key: "home", label: "Avaleht" },
    { key: "add", label: "Lisa" },
    { key: "archive", label: "Arhiiv" },
    { key: "friends", label: pendingRequests > 0 ? `Sõbrad (${pendingRequests})` : "Sõbrad" },
    { key: "profile", label: "Profiil" },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background flex items-center justify-around py-2">
        {items.map((item) => (
          <button key={item.key} onClick={() => onChange(item.key)}
            className="text-xs cursor-pointer bg-transparent border-none px-2 py-1"
            style={{
              fontWeight: current === item.key ? "bold" : "normal",
              color: current === item.key ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
            }}>
            {item.label}
          </button>
        ))}
        <button onClick={() => setShowLogoutDialog(true)}
          className="flex items-center gap-1.5 text-xs cursor-pointer bg-transparent border-none px-2 py-1 text-muted-foreground">
          {avatarUrl && (
            <Avatar className="h-6 w-6">
              <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
              <AvatarFallback className="text-[10px]">{(displayName || "?")[0].toUpperCase()}</AvatarFallback>
            </Avatar>
          )}
          Välja
        </button>
      </div>

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
