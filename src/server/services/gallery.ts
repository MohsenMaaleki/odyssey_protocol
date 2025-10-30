import type {
  GalleryEntry,
  SavePatchRequest,
  ListGalleryResponse,
} from '../../shared/types/gallery';
import { generateSVGPatch, createPatchMetadata } from './imageGenerator';

/**
 * Converts SVG string to data URL format for inline display
 */
function svgToDataUrl(svgString: string): string {
  const encoded = encodeURIComponent(svgString).replace(/'/g, '%27').replace(/"/g, '%22');
  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}

/**
 * Gallery Service
 * Manages mission patch gallery operations including storage, retrieval, and deletion
 */
export class GalleryService {
  private redis: any;
  private media: any;

  constructor(redis: any, media: any) {
    this.redis = redis;
    this.media = media;
  }

  /**
   * Initialize gallery storage if not present
   * Sets gallery to empty array and gallery_counter to 1
   */
  async initializeStorage(): Promise<void> {
    const gallery = await this.redis.get('gallery');
    const counter = await this.redis.get('gallery_counter');

    if (!gallery) {
      await this.redis.set('gallery', JSON.stringify([]));
    }

    if (!counter) {
      await this.redis.set('gallery_counter', '1');
    }
  }

  /**
   * Get all gallery entries from storage
   */
  private async getGalleryEntries(): Promise<GalleryEntry[]> {
    const galleryJson = await this.redis.get('gallery');
    if (!galleryJson) {
      return [];
    }
    return JSON.parse(galleryJson) as GalleryEntry[];
  }

  /**
   * Save gallery entries to storage
   */
  private async saveGalleryEntries(entries: GalleryEntry[]): Promise<void> {
    await this.redis.set('gallery', JSON.stringify(entries));
  }

  /**
   * Get current gallery counter value
   */
  private async getGalleryCounter(): Promise<number> {
    const counter = await this.redis.get('gallery_counter');
    return counter ? parseInt(counter) : 1;
  }

  /**
   * Increment gallery counter and return new value
   */
  private async incrementGalleryCounter(): Promise<number> {
    const newCounter = (await this.getGalleryCounter()) + 1;
    await this.redis.set('gallery_counter', newCounter.toString());
    return newCounter;
  }

  /**
   * Find existing gallery entry by mission_id
   */
  private findExistingEntry(entries: GalleryEntry[], mission_id: string): GalleryEntry | null {
    return entries.find((entry) => entry.mission_id === mission_id) || null;
  }

  /**
   * Generate mission metadata (title and subtitle) using AI or fallback logic
   */
  private async generateMetadata(
    missionData: SavePatchRequest
  ): Promise<{ title: string; subtitle: string }> {
    // Determine outcome
    let outcome: 'success' | 'fail' | 'abort';
    if (missionData.phase === 'RESULT') {
      outcome = missionData.success_chance >= 50 ? 'success' : 'fail';
    } else {
      outcome = 'abort';
    }

    // Generate title based on mission_id and outcome
    const missionNumber = missionData.mission_id.replace(/\D/g, '') || '1';
    const missionName = this.generateMissionName(parseInt(missionNumber));

    let title: string;
    if (outcome === 'success') {
      title = `${missionName} — Success`;
    } else if (outcome === 'fail') {
      title = `${missionName} — Failed`;
    } else {
      title = `${missionName} — Aborted`;
    }

    // Generate subtitle based on outcome and stats
    let subtitle: string;
    if (outcome === 'success') {
      subtitle = `Mission accomplished with ${missionData.science_points_delta} science points`;
    } else if (outcome === 'fail') {
      subtitle = `Mission failed during ${missionData.phase.toLowerCase()} phase`;
    } else {
      subtitle = `Mission aborted in ${missionData.phase.toLowerCase()} phase`;
    }

    return { title, subtitle };
  }

  /**
   * Generate a mission name based on mission number
   */
  private generateMissionName(missionNumber: number): string {
    const names = [
      'Luna I',
      'Luna II',
      'Vostok',
      'Mercury',
      'Gemini',
      'Apollo',
      'Soyuz',
      'Skylab',
      'Voyager',
      'Pioneer',
      'Galileo',
      'Cassini',
      'Hubble',
      'Kepler',
      'Juno',
      'Perseverance',
      'Curiosity',
      'Opportunity',
      'Spirit',
      'Phoenix',
    ];

    if (missionNumber > 0 && missionNumber <= names.length) {
      return names[missionNumber - 1] || `Mission ${missionNumber}`;
    }

    // For missions beyond the list, use generic naming
    return `Mission ${missionNumber}`;
  }

  /**
   * Enforce storage limit of 500 entries
   * Removes oldest entry (by created_at) when limit is exceeded
   */
  private enforceStorageLimit(entries: GalleryEntry[]): void {
    const MAX_ENTRIES = 500;

    if (entries.length > MAX_ENTRIES) {
      // Sort by created_at ascending (oldest first)
      entries.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      // Remove oldest entries until we're at the limit
      while (entries.length > MAX_ENTRIES) {
        entries.shift(); // Remove first (oldest) entry
      }
    }
  }

  /**
   * Save mission patch to gallery
   * Creates new entry or updates existing entry if mission_id already exists
   */
  async saveMissionPatch(missionData: SavePatchRequest, username: string): Promise<GalleryEntry> {
    // Ensure storage is initialized
    await this.initializeStorage();

    // Get current gallery entries
    const entries = await this.getGalleryEntries();

    // Check for existing entry
    const existingEntry = this.findExistingEntry(entries, missionData.mission_id);

    // Generate metadata
    const { title, subtitle } = await this.generateMetadata(missionData);

    // Create patch metadata
    const patchMetadata = createPatchMetadata(missionData, title, subtitle);

    // Generate SVG patch image
    const svgImage = generateSVGPatch(patchMetadata);

    // Convert SVG to data URL for inline display (Reddit media doesn't support SVG uploads)
    const imageUrl = svgToDataUrl(svgImage);

    // Determine outcome
    let outcome: 'success' | 'fail' | 'abort';
    if (missionData.phase === 'RESULT') {
      outcome = missionData.success_chance >= 50 ? 'success' : 'fail';
    } else {
      outcome = 'abort';
    }

    if (existingEntry) {
      // Update existing entry
      existingEntry.title = title;
      existingEntry.subtitle = subtitle;
      existingEntry.image_url = imageUrl;
      existingEntry.science_points = missionData.science_points_delta;
      existingEntry.outcome = outcome;
      existingEntry.stats = {
        fuel_end: missionData.fuel,
        hull_end: missionData.hull,
        crew_morale_end: missionData.crew_morale,
      };
      existingEntry.credits = {
        generated_by: 'SVG',
        author: username,
      };
      // Preserve original created_at timestamp

      await this.saveGalleryEntries(entries);
      return existingEntry;
    } else {
      // Create new entry
      const counter = await this.getGalleryCounter();
      const newEntry: GalleryEntry = {
        id: `G-${counter.toString().padStart(4, '0')}`,
        mission_id: missionData.mission_id,
        title,
        subtitle,
        image_url: imageUrl,
        created_at: new Date().toISOString(),
        science_points: missionData.science_points_delta,
        outcome,
        stats: {
          fuel_end: missionData.fuel,
          hull_end: missionData.hull,
          crew_morale_end: missionData.crew_morale,
        },
        credits: {
          generated_by: 'SVG',
          author: username,
        },
      };

      entries.push(newEntry);

      // Enforce storage limit before saving
      this.enforceStorageLimit(entries);

      await this.saveGalleryEntries(entries);
      await this.incrementGalleryCounter();

      return newEntry;
    }
  }

  /**
   * List gallery entries with pagination
   * Returns entries sorted by created_at descending (newest first)
   */
  async listGalleryEntries(page: number = 1, perPage: number = 12): Promise<ListGalleryResponse> {
    try {
      // Ensure storage is initialized
      await this.initializeStorage();

      // Get all entries
      const entries = await this.getGalleryEntries();

      // Sort by created_at descending (newest first)
      entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Calculate pagination
      const total = entries.length;
      const totalPages = Math.ceil(total / perPage);
      const startIndex = (page - 1) * perPage;
      const endIndex = startIndex + perPage;

      // Get paginated entries
      const paginatedEntries = entries.slice(startIndex, endIndex);

      return {
        status: 'success',
        entries: paginatedEntries,
        total,
        page,
        perPage,
        totalPages,
      };
    } catch (error) {
      console.error('Error listing gallery entries:', error);
      return {
        status: 'error',
        entries: [],
        total: 0,
        page,
        perPage,
        totalPages: 0,
      };
    }
  }

  /**
   * Get a single gallery entry by ID
   */
  async getGalleryEntry(id: string): Promise<GalleryEntry | null> {
    try {
      // Ensure storage is initialized
      await this.initializeStorage();

      // Get all entries
      const entries = await this.getGalleryEntries();

      // Find entry by ID
      const entry = entries.find((e) => e.id === id);

      return entry || null;
    } catch (error) {
      console.error(`Error getting gallery entry ${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a gallery entry by ID
   * Requires moderator permission check to be performed by caller
   */
  async deleteGalleryEntry(id: string, isModerator: boolean): Promise<boolean> {
    try {
      // Check moderator permission
      if (!isModerator) {
        console.error(`Unauthorized delete attempt for entry ${id}`);
        return false;
      }

      // Ensure storage is initialized
      await this.initializeStorage();

      // Get all entries
      const entries = await this.getGalleryEntries();

      // Find entry index
      const entryIndex = entries.findIndex((e) => e.id === id);

      if (entryIndex === -1) {
        console.error(`Gallery entry ${id} not found`);
        return false;
      }

      // Remove entry from array
      entries.splice(entryIndex, 1);

      // Save updated entries
      await this.saveGalleryEntries(entries);

      return true;
    } catch (error) {
      console.error(`Error deleting gallery entry ${id}:`, error);
      return false;
    }
  }
}
