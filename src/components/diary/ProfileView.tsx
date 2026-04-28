import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Training, TrainingGroup } from "@/types/training";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import AvatarCropDialog from "./AvatarCropDialog";

function effortLabel(t: Training) {
  if (!t.effort_type || !t.effort_value) return null;
  if (t.effort_type === "effort") return `Pingutus: ${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `Pulss: ${t.effort_value} BPM`;
  return null;
}

export default function ProfileView({
  trainings, groups,
}: {
  trainings: Training[];
  groups: TrainingGroup[];
}) {
  const { user, username } = useAuth();
  const [joinDate, setJoinDate] = useState<string>("...");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fallbackAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = username || user?.user_metadata?.full_name || user?.email || "Kasutaja";

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("created_at, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.created_at) setJoinDate(new Date(data.created_at).toLocaleDateString("et-EE"));
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
  }, [user]);

  // Stats: only friend-visible, non-deleted trainings (matches what friends actually see)
  const friendVisible = trainings.filter((t) => !t.deleted_at && t.visibility === "friends");
  const totalCount = friendVisible.length;
  const totalMinutes = friendVisible.reduce((s, t) => s + t.duration, 0);

  const friendsTrainings = friendVisible
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20);

  const shownAvatar = avatarUrl || fallbackAvatar;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Pilt peab olema väiksem kui 10MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(String(reader.result));
    reader.readAsDataURL(file);
  };

  const handleCropped = async (blob: Blob) => {
    if (!user) return;
    setCropSrc(null);
    setUploading(true);
    const path = `${user.id}/avatar-${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { setUploading(false); toast.error("Üleslaadimine ebaõnnestus"); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    setAvatarUrl(url);
    setUploading(false);
    toast.success("Profiilipilt uuendatud!");
  };

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">Minu profiil</h2>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Avatar className="h-14 w-14">
            {shownAvatar ? <AvatarImage src={shownAvatar} alt={displayName} /> : null}
            <AvatarFallback className="text-sm">{displayName[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Muuda profiilipilti"
            className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1 cursor-pointer border-2 border-background disabled:opacity-50"
          >
            <Camera className="h-3 w-3" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
        <div>
          <div className="text-base font-bold">{displayName}</div>
          <div className="text-xs text-muted-foreground">Liitus: {joinDate}</div>
          {uploading && <div className="text-xs text-muted-foreground">Laadin üles...</div>}
        </div>
      </div>

      <div className="border border-border rounded-sm p-3 mb-4 bg-card">
        <div className="text-xs font-medium text-muted-foreground mb-2">Statistika (sõpradele nähtav)</div>
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
