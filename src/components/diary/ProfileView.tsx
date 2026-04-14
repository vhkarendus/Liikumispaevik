import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Training } from "@/types/training";

function effortLabel(t: Training) {
  if (!t.effort_type || !t.effort_value) return null;
  if (t.effort_type === "effort") return `Pingutus: ${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `Pulss: ${t.effort_value} BPM`;
  return null;
}

export default function ProfileView({ trainings }: { trainings: Training[] }) {
  const { user, username } = useAuth();
  const [joinDate, setJoinDate] = useState<string>("...");

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = username || user?.user_metadata?.full_name || user?.email || "Kasutaja";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("created_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.created_at) {
          setJoinDate(new Date(data.created_at).toLocaleDateString("et-EE"));
        }
      });
  }, [user]);

  // Stats: all non-deleted trainings (including private)
  const activeTrainings = trainings.filter((t) => !t.deleted_at);
  const totalCount = activeTrainings.length;
  const totalMinutes = activeTrainings.reduce((s, t) => s + t.duration, 0);
  const friendsTrainings = activeTrainings
    .filter((t) => t.visibility === "friends")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">Minu profiil</h2>

      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-12 w-12">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="text-sm">{displayName[0].toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <div className="text-base font-bold">{displayName}</div>
          <div className="text-xs text-muted-foreground">Liitus: {joinDate}</div>
        </div>
      </div>

      <div className="border border-border rounded-sm p-3 mb-4 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-2">Statistika</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-primary">{totalCount}</div>
            <div className="text-[11px] text-muted-foreground">Treeningut</div>
          </div>
          <div>
            <div className="text-lg font-bold text-primary">{totalMinutes}</div>
            <div className="text-[11px] text-muted-foreground">Minutit kokku</div>
          </div>
          <div>
            <div className="text-xs font-medium text-primary mt-1">{joinDate}</div>
            <div className="text-[11px] text-muted-foreground">Liitus</div>
          </div>
        </div>
      </div>

      <h3 className="text-sm font-medium mb-2">Sõpradele nähtavad treeningud</h3>
      {friendsTrainings.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sõpradele nähtavaid treeninguid pole.</p>
      ) : (
        friendsTrainings.map((t) => (
          <div key={t.id} className="border border-border rounded-sm p-3 mb-2 bg-card">
            <div className="text-sm font-bold">{t.name}</div>
            <div className="text-muted-foreground text-[13px]">{t.date} · {t.duration} min</div>
            {t.note && <div className="text-[13px] mt-0.5">{t.note}</div>}
            {effortLabel(t) && <div className="text-xs text-muted-foreground mt-0.5">{effortLabel(t)}</div>}
          </div>
        ))
      )}
    </div>
  );
}
