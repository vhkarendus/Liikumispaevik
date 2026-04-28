import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Training, TrainingGroup } from "@/types/training";
import HomeView from "@/components/diary/HomeView";
import AddView from "@/components/diary/AddView";
import ArchiveView from "@/components/diary/ArchiveView";
import FriendsView from "@/components/diary/FriendsView";
import ProfileView from "@/components/diary/ProfileView";
import BottomNav from "@/components/diary/BottomNav";

export default function Index() {
  const { user, username, logout, loading } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("home");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [groups, setGroups] = useState<TrainingGroup[]>([]);
  const [friendCode, setFriendCode] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);

  const avatarUrl = profileAvatar || user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const displayName = username || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || null;

  useEffect(() => {
    if (!loading && !user) navigate("/login");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchAll = async () => {
      const [trainingsRes, groupsRes, profileRes, requestsRes] = await Promise.all([
        supabase.from("trainings").select("*").eq("user_id", user.id).order("date", { ascending: false }),
        supabase.from("training_groups").select("*").order("start_date", { ascending: false }),
        supabase.from("profiles").select("friend_code, avatar_url").eq("user_id", user.id).maybeSingle(),
        supabase.from("friendships").select("id").eq("addressee_id", user.id).eq("status", "pending"),
      ]);

      if (trainingsRes.data) setTrainings(trainingsRes.data as Training[]);
      if (groupsRes.data) setGroups(groupsRes.data as TrainingGroup[]);
      if (profileRes.data) {
        setFriendCode(profileRes.data.friend_code);
        setProfileAvatar(profileRes.data.avatar_url);
      }
      if (requestsRes.data) setPendingRequests(requestsRes.data.length);
    };

    fetchAll();

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

  // Soft delete: set deleted_at instead of removing
  const deleteTraining = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("trainings").update({ deleted_at: now }).eq("id", id);
    setTrainings((prev) => prev.map((t) => t.id === id ? { ...t, deleted_at: now } : t));
  };

  const deleteGroup = async (groupId: string) => {
    const now = new Date().toISOString();
    const ids = trainings.filter((t) => t.group_id === groupId).map((t) => t.id);
    await supabase.from("trainings").update({ deleted_at: now }).in("id", ids);
    await supabase.from("training_groups").update({ deleted_at: now }).eq("id", groupId);
    setTrainings((prev) => prev.map((t) => t.group_id === groupId ? { ...t, deleted_at: now } : t));
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, deleted_at: now } : g));
  };

  const restoreTraining = async (id: string) => {
    await supabase.from("trainings").update({ deleted_at: null }).eq("id", id);
    setTrainings((prev) => prev.map((t) => t.id === id ? { ...t, deleted_at: null } : t));
  };

  const restoreGroup = async (groupId: string) => {
    const ids = trainings.filter((t) => t.group_id === groupId).map((t) => t.id);
    await supabase.from("trainings").update({ deleted_at: null }).in("id", ids);
    await supabase.from("training_groups").update({ deleted_at: null }).eq("id", groupId);
    setTrainings((prev) => prev.map((t) => t.group_id === groupId ? { ...t, deleted_at: null } : t));
    setGroups((prev) => prev.map((g) => g.id === groupId ? { ...g, deleted_at: null } : g));
  };

  const permanentDeleteTraining = async (id: string) => {
    await supabase.from("trainings").delete().eq("id", id);
    setTrainings((prev) => prev.filter((t) => t.id !== id));
  };

  const permanentDeleteGroup = async (groupId: string) => {
    const ids = trainings.filter((t) => t.group_id === groupId).map((t) => t.id);
    await supabase.from("trainings").delete().in("id", ids);
    await supabase.from("training_groups").delete().eq("id", groupId);
    setTrainings((prev) => prev.filter((t) => t.group_id !== groupId));
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  if (loading) return <div className="p-10 text-center">Laadin...</div>;
  if (!user) return null;

  // Active (non-deleted) items
  const activeTrainings = trainings.filter((t) => !t.deleted_at);
  const activeGroups = groups.filter((g) => !g.deleted_at);

  return (
    <div className="max-w-[500px] mx-auto px-4 pt-4 pb-[90px]">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
        {avatarUrl && (
          <Avatar className="h-7 w-7 ring-2 ring-primary/20">
            <AvatarImage src={avatarUrl} alt={displayName || "Profiil"} />
            <AvatarFallback className="text-[10px]">{(displayName || "?")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
        )}
        <span>Sisse logitud: <strong className="text-foreground">{displayName}</strong></span>
      </div>

      {view === "home" && <HomeView trainings={activeTrainings} groups={activeGroups} friendCode={friendCode} onUpdateTrainings={setTrainings} onUpdateGroups={setGroups} />}
      {view === "add" && <AddView onAdd={addTraining} onAddPeriod={addPeriod} />}
      {view === "archive" && (
        <ArchiveView
          trainings={trainings}
          groups={groups}
          onDelete={deleteTraining}
          onUpdateTrainings={setTrainings}
          onDeleteGroup={deleteGroup}
          onUpdateGroups={setGroups}
          onRestore={restoreTraining}
          onRestoreGroup={restoreGroup}
          onPermanentDelete={permanentDeleteTraining}
          onPermanentDeleteGroup={permanentDeleteGroup}
        />
      )}
      {view === "friends" && <FriendsView />}
      {view === "profile" && <ProfileView trainings={trainings} groups={groups} />}

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
