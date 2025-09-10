export type Database = {
  public: {
    Tables: {
      media_assets: {
        Row: { id: string; name: string; type: "image"|"video"; path: string; url: string; duration_sec: number; width: number|null; height: number|null; created_at: string|null; user_id: string|null };
        Insert: { name: string; type: "image"|"video"; path: string; url: string; duration_sec?: number; width?: number|null; height?: number|null; user_id?: string|null };
        Update: Partial<Database["public"]["Tables"]["media_assets"]["Insert"]>;
      };
      playlists: { Row: { id: string; name: string; created_at: string|null }, Insert: { name: string }, Update: { name?: string } };
      playlist_items: {
        Row: { id: string; playlist_id: string; media_id: string; order_index: number; duration_sec: number|null; days_of_week: string|null; time_start: string|null; time_end: string|null };
        Insert: { playlist_id: string; media_id: string; order_index: number; duration_sec?: number|null; days_of_week?: string|null; time_start?: string|null; time_end?: string|null };
        Update: Partial<Database["public"]["Tables"]["playlist_items"]["Insert"]>;
      };
      screens: { Row: { id: string; name: string; location: string|null; created_at: string|null }, Insert: { name: string; location?: string|null }, Update: { name?: string; location?: string|null } };
      publications: { Row: { id: string; playlist_id: string; screen_id: string; active: boolean; created_at: string|null }, Insert: { playlist_id: string; screen_id: string; active?: boolean }, Update: { active?: boolean } };
    }
  }
}
