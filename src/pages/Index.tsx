import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Training, TrainingGroup } from "@/types/training";
import HomeView from "@/components/diary/HomeView";
import AddView from "@/components/diary/AddView";
import ArchiveView from "@/components/diary/ArchiveView";
import FriendsView from "@/components/diary/FriendsView";
import BottomNav from "@/components/diary/BottomNav";

export default function Index() {
  const { user, username, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("home");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  // Fetch data
  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const [trainingsRes, groupsRes, profileRes, requestsRes] = await Promise.all([
        supabase.from("trainings").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("training_groups").select("*").order("start_date", { ascending: false }),
        supabase.from("profiles").select("friend_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("friendships").select("id").eq("addressee_id", user.id).eq("status", "pending"),
      ]);

      if (trainingsRes.data) setTrainings(trainingsRes.data as Training[]);
      if (groupsRes.data) setGroups(groupsRes.data as TrainingGroup[]);
      if (profileRes.data) setFriendCode(profileRes.data.friend_code);
      if (requestsRes.data) setPendingRequests(requestsRes.data.length);
    };

    fetchAll();

    // Update last_seen periodically
    const updateLastSeen = () => {
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id).then(() => {});
    };
    updateLastSeen();
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleNav = (v: string) => {
    if (v === "logout") {
      logout().then(() => navigate("/login"));
    } else {
      setView(v);
    }
  };

  const addTraining = async (t: Omit<Training, "id" | "created_at">) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("trainings")
      .insert({ ...t, user_id: user.id })
      .select()
      .single();
    if (data && !error) {
      setTrainings((prev) => [data as Training, ...prev].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const addPeriod = async (
    group: { name: string; start_date: string; end_date: string },
    entries: Omit<Training, "id" | "created_at">[]
  ) => {
    if (!user) return;
    const { data: groupData, error: groupError } = await supabase
      .from("training_groups")
      .insert({ ...group, user_id: user.id })
      .select()
      .single();
    if (groupError || !groupData) return;

    const rows = entries.map((t) => ({ ...t, user_id: user.id, group_id: groupData.id }));
    const { data, error } = await supabase.from("trainings").insert(rows).select();
    if (data && !error) {
      setGroups((prev) => [groupData as TrainingGroup, ...prev]);
      setTrainings((prev) => [...prev, ...(data as Training[])].sort((a, b) => b.date.localeCompare(a.date)));
    }
  };

  const deleteTraining = async (id: string) => {
    await supabase.from("trainings").delete().eq("id", id);
    setTrainings((prev) => prev.filter((t) => t.id !== id));
  };

  if (loading) return <div className="p-10 text-center">Laadin...</div>;
  if (!user) return null;

  return (
    <div className="max-w-[500px] mx-auto px-4 pt-4 pb-[70px]">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        {avatarUrl && (
          <Avatar className="h-7 w-7">
            <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
            <AvatarFallback className="text-[10px]">{(displayName || "?")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <span>Sisse logitud: <strong>{displayName}</strong></span>
      </div>

      {view === "home" && <HomeView trainings={trainings} groups={groups} friendCode={friendCode} onUpdateTrainings={setTrainings} />}
      {view === "add" && <AddView onAdd={addTraining} onAddPeriod={addPeriod} />}
      {view === "archive" && <ArchiveView trainings={trainings} groups={groups} onDelete={deleteTraining} onUpdateTrainings={setTrainings} />}
      {view === "friends" && <FriendsView />}

      <BottomNav
        current={view}
        onChange={handleNav}
        avatarUrl={avatarUrl}
        displayName={displayName}
        pendingRequests={pendingRequests}
      />
    </div>
  );
}
