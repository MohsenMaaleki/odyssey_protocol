import type { SavePatchRequest } from '../../shared/types/gallery';

/**
 * Metadata for generating mission patch images
 */
export interface PatchMetadata {
  mission_id: string;
  title: string;
  subtitle: string;
  outcome: 'success' | 'fail' | 'abort';
  science_points: number;
  payload?: string;
}

/**
 * Color scheme mapping based on mission outcome
 */
const OUTCOME_COLORS = {
  success: '#10b981', // green
  fail: '#ef4444', // red
  abort: '#f59e0b', // yellow/amber
} as const;

/**
 * Emoji selection based on outcome and payload
 */
function selectEmoji(outcome: 'success' | 'fail' | 'abort', payload?: string): string {
  if (outcome === 'success') {
    // Choose emoji based on payload type
    if (payload?.toLowerCase().includes('satellite')) {
      return '🛰️';
    }
    return '🚀';
  } else if (outcome === 'fail') {
    return '💥';
  } else {
    // abort
    return '⚠️';
  }
}

/**
 * Generates an SVG mission patch image
 */
export function generateSVGPatch(metadata: PatchMetadata): string {
  const { mission_id, title, subtitle, outcome, science_points, payload } = metadata;

  const backgroundColor = OUTCOME_COLORS[outcome];
  const emoji = selectEmoji(outcome, payload);

  // SVG template with mission patch design
  const svg = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background with outcome color -->
  <rect width="1024" height="1024" fill="${backgroundColor}"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="984" height="984" 
        fill="none" stroke="#fff" stroke-width="4"/>
  
  <!-- Mission ID at top -->
  <text x="512" y="100" text-anchor="middle" 
        font-size="48" fill="#fff" font-weight="bold" font-family="Arial, sans-serif">
    ${escapeXml(mission_id)}
  </text>
  
  <!-- Outcome emoji (center) -->
  <text x="512" y="512" text-anchor="middle" 
        font-size="200">
    ${emoji}
  </text>
  
  <!-- Title -->
  <text x="512" y="700" text-anchor="middle" 
        font-size="42" fill="#fff" font-weight="bold" font-family="Arial, sans-serif">
    ${escapeXml(title)}
  </text>
  
  <!-- Subtitle -->
  <text x="512" y="760" text-anchor="middle" 
        font-size="32" fill="#fff" font-family="Arial, sans-serif">
    ${escapeXml(subtitle)}
  </text>
  
  <!-- Science points at bottom -->
  <text x="512" y="900" text-anchor="middle" 
        font-size="36" fill="#fff" font-family="Arial, sans-serif">
    🧪 ${science_points} Science Points
  </text>
</svg>`;

  return svg;
}

/**
 * Escapes XML special characters for safe SVG rendering
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Creates patch metadata from mission data
 */
export function createPatchMetadata(
  missionData: SavePatchRequest,
  title: string,
  subtitle: string
): PatchMetadata {
  // Determine outcome based on phase and success chance
  let outcome: 'success' | 'fail' | 'abort';
  if (missionData.phase === 'RESULT') {
    outcome = missionData.success_chance >= 50 ? 'success' : 'fail';
  } else {
    outcome = 'abort';
  }

  return {
    mission_id: missionData.mission_id,
    title,
    subtitle,
    outcome,
    science_points: missionData.science_points_delta,
    payload: missionData.design.payload,
  };
}

/**
 * Uploads an image to Reddit media storage
 * Supports both PNG (from URL) and SVG (as data URL) formats
 * Implements retry logic for failed uploads
 *
 * @param imageData - Either a URL string (for PNG) or SVG string
 * @param format - Image format ('png' or 'svg')
 * @param mediaPlugin - Devvit media plugin instance
 * @returns Uploaded image URL or null on failure
 */
export async function uploadImage(
  imageData: string,
  format: 'png' | 'svg',
  mediaPlugin: { upload: (opts: { url: string; type: 'image' }) => Promise<{ mediaUrl: string }> }
): Promise<string | null> {
  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let uploadUrl: string;

      if (format === 'svg') {
        // Convert SVG string to data URL
        uploadUrl = svgToDataUrl(imageData);
      } else {
        // PNG is already a URL
        uploadUrl = imageData;
      }

      // Upload to Reddit media storage
      const response = await mediaPlugin.upload({
        url: uploadUrl,
        type: 'image',
      });

      return response.mediaUrl;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `Image upload attempt ${attempt + 1}/${maxRetries + 1} failed:`,
        lastError.message
      );

      // If this was the last retry, break
      if (attempt === maxRetries) {
        break;
      }

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.error('Image upload failed after all retries:', lastError?.message);
  return null;
}

/**
 * Converts SVG string to data URL format
 */
function svgToDataUrl(svgString: string): string {
  // Encode SVG for use in data URL
  const encoded = encodeURIComponent(svgString).replace(/'/g, '%27').replace(/"/g, '%22');

  return `data:image/svg+xml;charset=UTF-8,${encoded}`;
}
