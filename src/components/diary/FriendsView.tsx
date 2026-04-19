import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Friendship, FriendProfile, Training } from "@/types/training";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min tagasi`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h tagasi`;
  const days = Math.floor(hours / 24);
  return `${days}p tagasi`;
}

function OnlineIndicator({ lastSeen }: { lastSeen: string | null }) {
  if (!lastSeen) return <span className="text-xs text-muted-foreground">Tundmatu</span>;
  const isOnline = Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000;
  return (
    <span className="flex items-center gap-1 text-xs">
      <span className={`inline-block w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-muted-foreground"}`} />
      {isOnline ? "Online" : timeAgo(lastSeen)}
    </span>
  );
}

function effortLabel(t: Training) {
  if (!t.effort_type || !t.effort_value) return null;
  if (t.effort_type === "effort") return `Pingutus: ${t.effort_value}/10`;
  if (t.effort_type === "heart_rate") return `Pulss: ${t.effort_value} BPM`;
  return null;
}

function FriendStats({ friend }: { friend: FriendProfile }) {
  const [stats, setStats] = useState<{ joined: string; count: number; totalMinutes: number } | null>(null);

  useEffect(() => {
    const load = async () => {
      const [profileRes, trainingsRes] = await Promise.all([
        supabase.from("profiles").select("created_at").eq("user_id", friend.user_id).maybeSingle(),
        supabase.from("trainings").select("duration").eq("user_id", friend.user_id)
          .eq("visibility", "friends").is("deleted_at", null),
      ]);
      const joined = profileRes.data?.created_at
        ? new Date(profileRes.data.created_at).toLocaleDateString("et-EE")
        : "Tundmatu";
      const allTrainings = trainingsRes.data || [];
      const totalMinutes = allTrainings.reduce((sum, t) => sum + (t.duration || 0), 0);
      setStats({ joined, count: allTrainings.length, totalMinutes });
    };
    load();
  }, [friend.user_id]);

  if (!stats) return null;

  return (
    <div className="border border-border rounded-sm p-3 mb-3 bg-card">
      <div className="text-xs font-medium text-muted-foreground mb-2">Statistika</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-primary">{stats.count}</div>
          <div className="text-[11px] text-muted-foreground">Treeningut</div>
        </div>
        <div>
          <div className="text-lg font-bold text-primary">{stats.totalMinutes}</div>
          <div className="text-[11px] text-muted-foreground">Minutit kokku</div>
        </div>
        <div>
          <div className="text-xs font-medium text-primary mt-1">{stats.joined}</div>
          <div className="text-[11px] text-muted-foreground">Liitus</div>
        </div>
      </div>
    </div>
  );
}

export default function FriendsView() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"friends" | "requests">("friends");
  const [friends, setFriends] = useState<(Friendship & { profile: FriendProfile })[]>([]);
  const [requests, setRequests] = useState<(Friendship & { profile: FriendProfile })[]>([]);
  const [searchCode, setSearchCode] = useState("");
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);
  const [addMsg, setAddMsg] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [viewTrainings, setViewTrainings] = useState<{ friend: FriendProfile; trainings: Training[] } | null>(null);

  const loadFriends = useCallback(async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships) return;

    const accepted = friendships.filter((f) => f.status === "accepted");
    const pending = friendships.filter((f) => f.status === "pending" && f.addressee_id === user.id);

    const loadProfiles = async (items: typeof friendships, getOtherId: (f: typeof friendships[0]) => string) => {
      const results: (Friendship & { profile: FriendProfile })[] = [];
      for (const f of items) {
        const otherId = getOtherId(f);
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id, username, friend_code, avatar_url, last_seen")
          .eq("user_id", otherId)
          .maybeSingle();
        if (profile) results.push({ ...f, profile: profile as FriendProfile });
      }
      return results;
    };

    const friendsWithProfiles = await loadProfiles(accepted, (f) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const requestsWithProfiles = await loadProfiles(pending, (f) => f.requester_id);

    setFriends(friendsWithProfiles);
    setRequests(requestsWithProfiles);
  }, [user]);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  // Search friend codes
  useEffect(() => {
    if (searchCode.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase.rpc("search_friend_code", { p_code: searchCode });
      if (data) {
        setSearchResults((data as FriendProfile[]).filter((p) => p.user_id !== user?.id));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchCode, user?.id]);

  const sendRequest = async (friendUserId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: friendUserId });
    if (error) {
      setAddMsg("Kutse saatmine ebaõnnestus (võib-olla juba saadetud)");
    } else {
      setAddMsg("Sõbrakutse saadetud!");
      setSearchCode(""); setSearchResults([]);
    }
    setTimeout(() => setAddMsg(""), 3000);
  };

  const acceptRequest = async (friendshipId: string) => {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    loadFriends();
  };

  const rejectRequest = async () => {
    if (!rejectId) return;
    await supabase.from("friendships").delete().eq("id", rejectId);
    setRejectId(null);
    loadFriends();
  };

  const viewFriendTrainings = async (friend: FriendProfile) => {
    const { data } = await supabase
      .from("trainings")
      .select("*")
      .eq("user_id", friend.user_id)
      .order("date", { ascending: false })
      .limit(20);
    setViewTrainings({ friend, trainings: (data as Training[]) || [] });
  };

  if (viewTrainings) {
    return (
      <div>
        <button onClick={() => setViewTrainings(null)}
          className="text-sm text-primary cursor-pointer bg-transparent border-none underline mb-3">
          ← Tagasi
        </button>
        <div className="flex items-center gap-2 mb-3">
          <Avatar className="h-8 w-8">
            {viewTrainings.friend.avatar_url ? <AvatarImage src={viewTrainings.friend.avatar_url} /> : null}
            <AvatarFallback className="text-xs">{viewTrainings.friend.username[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <h2 className="text-lg font-medium">{viewTrainings.friend.username}</h2>
        </div>

        <FriendStats friend={viewTrainings.friend} />

        <h3 className="text-sm font-medium mb-2">Treeningud</h3>
        {viewTrainings.trainings.length === 0 ? (
          <p className="text-sm text-muted-foreground">Treeninguid pole näha.</p>
        ) : (
          viewTrainings.trainings.map((t) => (
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

  return (
    <div>
      <h2 className="text-lg font-medium mb-3">Sõbrad</h2>

      {/* Add friend */}
      <div className="border border-border rounded-sm p-3 mb-4 bg-card">
        <label className="block text-[13px] mb-1">Lisa sõber koodi järgi</label>
        <input type="text" value={searchCode} onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
          placeholder="Sisesta sõbrakood..."
          className="w-full border border-border rounded-sm px-2 py-1 text-sm bg-background mb-1" />
        {searchResults.length > 0 && (
          <div className="border border-border rounded-sm bg-background">
            {searchResults.map((r) => (
              <div key={r.user_id} className="flex items-center justify-between p-2 border-b border-border last:border-b-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    {r.avatar_url ? <AvatarImage src={r.avatar_url} /> : null}
                    <AvatarFallback className="text-[10px]">{r.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{r.username}</span>
                  <span className="text-xs text-muted-foreground font-mono">{r.friend_code}</span>
                </div>
                <button onClick={() => sendRequest(r.user_id)}
                  className="bg-primary text-primary-foreground px-2 py-0.5 rounded-sm text-xs cursor-pointer">
                  Lisa
                </button>
              </div>
            ))}
          </div>
        )}
        {addMsg && <p className="text-[13px] mt-1 text-green-600">{addMsg}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {(["friends", "requests"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-sm text-sm cursor-pointer border ${
              tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border"
            }`}>
            {t === "friends" ? "Sõbrad" : `Kutsed (${requests.length})`}
          </button>
        ))}
      </div>

      {tab === "friends" ? (
        friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sul pole veel sõpru.</p>
        ) : (
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between border border-border rounded-sm p-3 bg-card">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {f.profile.avatar_url ? <AvatarImage src={f.profile.avatar_url} /> : null}
                    <AvatarFallback className="text-xs">{f.profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{f.profile.username}</div>
                    <OnlineIndicator lastSeen={f.profile.last_seen} />
                  </div>
                </div>
                <button onClick={() => viewFriendTrainings(f.profile)}
                  className="text-xs text-primary cursor-pointer bg-transparent border-none underline">
                  Vaata treeninguid
                </button>
              </div>
            ))}
          </div>
        )
      ) : (
        requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sissetulevaid kutseid pole.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex items-center justify-between border border-border rounded-sm p-3 bg-card">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {r.profile.avatar_url ? <AvatarImage src={r.profile.avatar_url} /> : null}
                    <AvatarFallback className="text-xs">{r.profile.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm">{r.profile.username}</div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => acceptRequest(r.id)}
                    className="bg-primary text-primary-foreground px-2 py-0.5 rounded-sm text-xs cursor-pointer">
                    Nõustu
                  </button>
                  <button onClick={() => setRejectId(r.id)}
                    className="text-destructive text-xs cursor-pointer border border-destructive rounded-sm px-2 py-0.5 bg-background">
                    Keeldu
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <AlertDialog open={!!rejectId} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kas oled kindel?</AlertDialogTitle>
            <AlertDialogDescription>Sõbrakutse lükatakse tagasi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tühista</AlertDialogCancel>
            <AlertDialogAction onClick={rejectRequest}>Jah, keeldu</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
