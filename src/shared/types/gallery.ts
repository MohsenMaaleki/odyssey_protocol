// Gallery Entry Types

export interface GalleryEntry {
  id: string; // Format: "G-0001", "G-0002", etc.
  mission_id: string; // Reference to mission (e.g., "OP-001")
  title: string; // e.g., "Luna I — First Orbit"
  subtitle: string; // e.g., "Successful orbital insertion"
  image_url: string | null; // Devvit media URL or null if upload failed
  created_at: string; // ISO 8601 datetime
  science_points: number; // Points earned from mission
  outcome: 'success' | 'fail' | 'abort';
  stats: {
    fuel_end: number; // 0-100
    hull_end: number; // 0-100
    crew_morale_end: number; // 0-100
  };
  credits: {
    generated_by: 'AI' | 'SVG'; // Image generation method
    author: string; // Reddit username (e.g., "u/player123")
  };
}

// Storage Schema Extension

export interface GlobalStorage {
  // Existing fields (for reference, not enforced here)
  total_science_points?: number;
  unlocks?: string[];
  mission_counter?: number;
  leaderboard?: Record<string, number>;

  // Gallery fields
  gallery: GalleryEntry[];
  gallery_counter: number;
}

// API Request Types

export interface SavePatchRequest {
  mission_id: string;
  phase: string;
  fuel: number;
  hull: number;
  crew_morale: number;
  success_chance: number;
  science_points_delta: number;
  log: string[];
  design: {
    engine: string;
    fuel_tanks: number;
    payload: string;
    crew: string[];
  };
}

export interface ListGalleryRequest {
  page: number;
  perPage: number;
}

// API Response Types

export interface SavePatchResponse {
  status: 'success' | 'error';
  message: string;
  entry?: GalleryEntry;
}

export interface ListGalleryResponse {
  status: 'success' | 'error';
  entries: GalleryEntry[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface GetGalleryItemResponse {
  status: 'success' | 'error';
  entry?: GalleryEntry;
  message?: string;
}

export interface DeleteGalleryItemResponse {
  status: 'success' | 'error';
  message: string;
}
