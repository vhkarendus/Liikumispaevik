export type Training = {
  id: string;
  name: string;
  date: string;
  duration: number;
  note: string | null;
  created_at: string;
  visibility: string;
  group_id: string | null;
  effort_type: string | null;
  effort_value: number | null;
  deleted_at: string | null;
};

export type TrainingGroup = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  created_at: string;
  user_id: string;
  deleted_at: string | null;
};

export type FriendProfile = {
  user_id: string;
  username: string;
  friend_code: string | null;
  avatar_url: string | null;
  last_seen: string | null;
};

export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
};
