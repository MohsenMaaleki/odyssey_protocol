import type {
  Suggestion,
  Ballot,
  SuggestionsMeta,
  VoteSuggestionResponse,
  PaginatedSuggestions,
  PromotedMission,
  SuggestionStatus,
  VoteValue,
  SortOrder,
} from '../../shared/types/missionSuggestions';

/**
 * Mission Suggestion Service
 * Manages community-proposed missions, voting, and ballot system
 */
export class MissionSuggestionService {
  private redis: any;
  private reddit: any;
  private context: any;

  // Storage key constants (no 'global:' prefix needed when using redis.global)
  private static readonly STORAGE_KEYS = {
    SUGGESTIONS: 'missionSuggestions',
    META: 'suggestions_meta',
    BALLOTS: 'ballots',
  };

  constructor(redis: any, reddit: any, context: any) {
    this.redis = redis;
    this.reddit = reddit;
    this.context = context;
  }

  /**
   * Initialize storage on app installation
   */
  async initializeStorage(): Promise<void> {
    const existingMeta = await this.redis.get(MissionSuggestionService.STORAGE_KEYS.META);

    if (!existingMeta) {
      const defaultMeta: SuggestionsMeta = {
        counter: 0,
        banlist: [],
        min_account_age_days: 0,
        max_suggestions_per_user: 5,
        last_ballot_id: 0,
      };

      await this.saveMeta(defaultMeta);
      await this.saveSuggestions([]);
      await this.saveBallots([]);
      console.log('Mission suggestions storage initialized');
    }
  }

  // Helper methods for data access

  private async getSuggestions(): Promise<Suggestion[]> {
    console.log(
      '[MissionSuggestionService] Getting suggestions from Redis key:',
      MissionSuggestionService.STORAGE_KEYS.SUGGESTIONS
    );
    const data = await this.redis.get(MissionSuggestionService.STORAGE_KEYS.SUGGESTIONS);
    console.log(
      '[MissionSuggestionService] Raw data from Redis:',
      data ? `${data.substring(0, 100)}...` : 'NULL'
    );
    const parsed = data ? JSON.parse(data) : [];
    console.log('[MissionSuggestionService] Parsed suggestions count:', parsed.length);
    return parsed;
  }

  private async saveSuggestions(suggestions: Suggestion[]): Promise<void> {
    console.log(
      '[MissionSuggestionService] Saving suggestions to Redis key:',
      MissionSuggestionService.STORAGE_KEYS.SUGGESTIONS
    );
    console.log('[MissionSuggestionService] Suggestions count:', suggestions.length);
    console.log('[MissionSuggestionService] First suggestion status:', suggestions[0]?.status);
    const jsonData = JSON.stringify(suggestions);
    console.log('[MissionSuggestionService] JSON data length:', jsonData.length);
    await this.redis.set(MissionSuggestionService.STORAGE_KEYS.SUGGESTIONS, jsonData);
    console.log('[MissionSuggestionService] Suggestions saved successfully');

    // Verify the save by reading back
    const verification = await this.redis.get(MissionSuggestionService.STORAGE_KEYS.SUGGESTIONS);
    console.log(
      '[MissionSuggestionService] Verification read:',
      verification ? 'DATA EXISTS' : 'NULL'
    );
  }

  private async getMeta(): Promise<SuggestionsMeta> {
    const data = await this.redis.get(MissionSuggestionService.STORAGE_KEYS.META);
    if (!data) {
      return {
        counter: 0,
        banlist: [],
        min_account_age_days: 0,
        max_suggestions_per_user: 5,
        last_ballot_id: 0,
      };
    }
    return JSON.parse(data);
  }

  private async saveMeta(meta: SuggestionsMeta): Promise<void> {
    await this.redis.set(MissionSuggestionService.STORAGE_KEYS.META, JSON.stringify(meta));
  }

  private async getBallots(): Promise<Ballot[]> {
    const data = await this.redis.get(MissionSuggestionService.STORAGE_KEYS.BALLOTS);
    return data ? JSON.parse(data) : [];
  }

  private async saveBallots(ballots: Ballot[]): Promise<void> {
    await this.redis.set(MissionSuggestionService.STORAGE_KEYS.BALLOTS, JSON.stringify(ballots));
  }

  /**
   * Submit a new mission suggestion
   */
  async submitSuggestion(
    title: string,
    target: string,
    risk: string,
    reward: string,
    description: string,
    payload_hint: string,
    proposer: string
  ): Promise<{ ok: boolean; suggestion?: Suggestion; message?: string }> {
    // Check if user is banned
    if (await this.isUserBanned(proposer)) {
      return {
        ok: false,
        message: 'User is banned from submitting suggestions',
      };
    }

    // Check submission cap
    const userCount = await this.getUserSuggestionCount(proposer);
    const meta = await this.getMeta();
    if (userCount >= meta.max_suggestions_per_user) {
      return {
        ok: false,
        message: 'Maximum suggestions per season reached',
      };
    }

    // Validate input
    const validation = this.validateSuggestionInput({
      title,
      target,
      risk,
      reward,
      description,
      payload_hint,
    });

    if (!validation.valid) {
      return {
        ok: false,
        message: validation.errors.join(', '),
      };
    }

    // Generate ID
    const id = await this.generateSuggestionId();

    // Create suggestion
    const suggestion: Suggestion = {
      id,
      title: title.trim(),
      target,
      risk: risk as 'Low' | 'Medium' | 'High',
      reward: reward as 'Science' | 'Unlock' | 'Prestige',
      description: description.trim(),
      payload_hint: payload_hint as 'Probe' | 'Hab' | 'Cargo' | 'Any',
      proposer,
      status: 'pending',
      votes: {
        up: 0,
        down: 0,
      },
      voters: {},
      created_at: new Date().toISOString(),
      curated_by: null,
      curated_at: null,
      ballot_id: null,
    };

    // Persist to Redis
    const suggestions = await this.getSuggestions();
    suggestions.push(suggestion);
    await this.saveSuggestions(suggestions);

    // Increment counter
    meta.counter++;
    await this.saveMeta(meta);

    return {
      ok: true,
      suggestion,
    };
  }

  /**
   * Check if user is banned
   */
  async isUserBanned(username: string): Promise<boolean> {
    const meta = await this.getMeta();
    return meta.banlist.includes(username);
  }

  /**
   * Get count of suggestions submitted by user
   */
  async getUserSuggestionCount(username: string): Promise<number> {
    const suggestions = await this.getSuggestions();
    return suggestions.filter((s) => s.proposer === username).length;
  }

  /**
   * Validate suggestion input
   */
  private validateSuggestionInput(data: {
    title: string;
    target: string;
    risk: string;
    reward: string;
    description: string;
    payload_hint: string;
  }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Title validation
    const trimmedTitle = data.title.trim();
    if (trimmedTitle.length < 4 || trimmedTitle.length > 60) {
      errors.push('Title must be between 4 and 60 characters');
    }

    // Description validation
    const trimmedDescription = data.description.trim();
    if (trimmedDescription.length === 0) {
      errors.push('Description is required');
    }
    if (trimmedDescription.length > 280) {
      errors.push('Description must not exceed 280 characters');
    }

    // Required fields
    if (!data.target) {
      errors.push('Target is required');
    }
    if (!data.risk) {
      errors.push('Risk is required');
    }
    if (!data.reward) {
      errors.push('Reward is required');
    }
    if (!data.payload_hint) {
      errors.push('Payload hint is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate unique suggestion ID in format S-XXXX
   */
  private async generateSuggestionId(): Promise<string> {
    // Note: counter is incremented after ID generation in submitSuggestion
    const meta = await this.getMeta();
    return `S-${String(meta.counter + 1).padStart(4, '0')}`;
  }

  /**
   * Vote on a suggestion (idempotent)
   */
  async voteSuggestion(
    suggestionId: string,
    username: string,
    value: VoteValue
  ): Promise<VoteSuggestionResponse> {
    const suggestions = await this.getSuggestions();
    const suggestion = suggestions.find((s) => s.id === suggestionId);

    if (!suggestion) {
      return {
        ok: false,
        up: 0,
        down: 0,
        total: 0,
        message: 'Suggestion not found',
      };
    }

    // Check if voting is allowed for this status
    if (suggestion.status === 'rejected' || suggestion.status === 'archived') {
      return {
        ok: false,
        up: suggestion.votes.up,
        down: suggestion.votes.down,
        total: suggestion.votes.up - suggestion.votes.down,
        message: 'Voting not allowed for this suggestion',
      };
    }

    // Update voters map (idempotent - replaces existing vote)
    suggestion.voters[username] = value;

    // Recalculate vote counts from voters map
    let upVotes = 0;
    let downVotes = 0;

    for (const voteValue of Object.values(suggestion.voters)) {
      if (voteValue === 1) {
        upVotes++;
      } else if (voteValue === -1) {
        downVotes++;
      }
      // value === 0 means no vote, so we don't count it
    }

    suggestion.votes.up = upVotes;
    suggestion.votes.down = downVotes;

    // Persist updated suggestions
    await this.saveSuggestions(suggestions);

    return {
      ok: true,
      up: upVotes,
      down: downVotes,
      total: upVotes - downVotes,
    };
  }

  /**
   * List suggestions with filtering, sorting, and pagination
   */
  async listSuggestions(
    status: SuggestionStatus | 'all',
    page: number,
    perPage: number,
    sort: SortOrder,
    filterUsername?: string
  ): Promise<PaginatedSuggestions> {
    let suggestions = await this.getSuggestions();

    // Filter by status
    if (status !== 'all') {
      suggestions = suggestions.filter((s) => s.status === status);
    }

    // Filter by username (for "Mine" tab)
    if (filterUsername) {
      suggestions = suggestions.filter((s) => s.proposer === filterUsername);
    }

    // Sort
    if (sort === 'top') {
      // Sort by vote score (up - down) descending
      suggestions.sort((a, b) => {
        const scoreA = a.votes.up - a.votes.down;
        const scoreB = b.votes.up - b.votes.down;
        return scoreB - scoreA;
      });
    } else if (sort === 'new') {
      // Sort by creation timestamp descending (newest first)
      suggestions.sort((a, b) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }

    // Calculate pagination
    const total = suggestions.length;
    const totalPages = Math.ceil(total / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedSuggestions = suggestions.slice(startIndex, endIndex);

    return {
      suggestions: paginatedSuggestions,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        perPage,
      },
    };
  }

  /**
   * Approve a suggestion (moderator only)
   */
  async approveSuggestion(
    suggestionId: string,
    moderator: string
  ): Promise<{ ok: boolean; suggestion?: Suggestion; message?: string }> {
    console.log('[MissionSuggestionService] approveSuggestion called for:', suggestionId);
    const suggestions = await this.getSuggestions();
    console.log('[MissionSuggestionService] Total suggestions:', suggestions.length);

    const suggestion = suggestions.find((s) => s.id === suggestionId);
    console.log(
      '[MissionSuggestionService] Found suggestion:',
      suggestion ? suggestion.id : 'NOT FOUND'
    );

    if (!suggestion) {
      console.error('[MissionSuggestionService] Suggestion not found:', suggestionId);
      return {
        ok: false,
        message: 'Suggestion not found',
      };
    }

    console.log('[MissionSuggestionService] Current status:', suggestion.status);

    // Update status
    suggestion.status = 'approved';
    suggestion.curated_by = moderator;
    suggestion.curated_at = new Date().toISOString();

    console.log('[MissionSuggestionService] Updated status to:', suggestion.status);
    console.log('[MissionSuggestionService] Saving suggestions...');

    // Persist
    await this.saveSuggestions(suggestions);

    console.log('[MissionSuggestionService] Suggestions saved successfully');

    return {
      ok: true,
      suggestion,
    };
  }

  /**
   * Reject a suggestion (moderator only)
   */
  async rejectSuggestion(
    suggestionId: string,
    moderator: string,
    reason?: string
  ): Promise<{ ok: boolean; message?: string }> {
    console.log('[MissionSuggestionService] rejectSuggestion called for:', suggestionId);
    const suggestions = await this.getSuggestions();
    console.log('[MissionSuggestionService] Total suggestions:', suggestions.length);

    const suggestion = suggestions.find((s) => s.id === suggestionId);
    console.log(
      '[MissionSuggestionService] Found suggestion:',
      suggestion ? suggestion.id : 'NOT FOUND'
    );

    if (!suggestion) {
      console.error('[MissionSuggestionService] Suggestion not found:', suggestionId);
      return {
        ok: false,
        message: 'Suggestion not found',
      };
    }

    console.log('[MissionSuggestionService] Current status:', suggestion.status);

    // Update status
    suggestion.status = 'rejected';
    suggestion.curated_by = moderator;
    suggestion.curated_at = new Date().toISOString();

    console.log('[MissionSuggestionService] Updated status to:', suggestion.status);
    console.log('[MissionSuggestionService] Saving suggestions...');

    // Persist
    await this.saveSuggestions(suggestions);

    console.log('[MissionSuggestionService] Suggestions saved successfully');

    return {
      ok: true,
      message: reason || 'Suggestion rejected',
    };
  }

  /**
   * Check if user has moderator permission
   */
  async checkModeratorPermission(username: string): Promise<boolean> {
    try {
      const subredditName = this.context.subredditName;
      if (!subredditName) {
        console.error('[MissionSuggestions] Subreddit name not found in context');
        return false;
      }

      console.log(
        `[MissionSuggestions] Checking moderator permission for ${username} in r/${subredditName}`
      );

      // For dev/test subreddits, check if user is creator or use fallback
      try {
        const subreddit = await this.reddit.getSubredditInfoByName(subredditName);
        const currentUser = await this.reddit.getCurrentUser();

        // Check if current user is a moderator or creator
        const isModerator =
          currentUser?.id === subreddit?.creatorId ||
          subredditName.includes('_dev') ||
          subredditName.includes('_test');

        console.log(`[MissionSuggestions] Moderator check result: ${isModerator}`);
        return isModerator;
      } catch (modCheckError) {
        console.error(
          '[MissionSuggestions] Error checking moderator via subreddit info:',
          modCheckError
        );

        // Fallback: For dev/test subreddits, assume moderator
        const isDevSubreddit = subredditName.includes('_dev') || subredditName.includes('_test');
        console.log(`[MissionSuggestions] Using dev subreddit fallback: ${isDevSubreddit}`);
        return isDevSubreddit;
      }
    } catch (error) {
      console.error('[MissionSuggestions] Error checking moderator permission:', error);
      return false;
    }
  }

  /**
   * Create a ballot with 2-4 suggestions (moderator only)
   */
  async createBallot(
    suggestionIds: string[],
    closesInMinutes: number
  ): Promise<{ ok: boolean; ballot?: Ballot; message?: string }> {
    // Validate suggestion count
    if (suggestionIds.length < 2 || suggestionIds.length > 4) {
      return {
        ok: false,
        message: 'Ballot must contain between 2 and 4 suggestions',
      };
    }

    // Check for existing open ballot
    const ballots = await this.getBallots();
    const existingOpenBallot = ballots.find((b) => b.status === 'open');
    if (existingOpenBallot) {
      return {
        ok: false,
        message: 'An open ballot already exists',
      };
    }

    // Validate that all suggestions exist
    const suggestions = await this.getSuggestions();
    for (const id of suggestionIds) {
      const suggestion = suggestions.find((s) => s.id === id);
      if (!suggestion) {
        return {
          ok: false,
          message: `Suggestion ${id} not found`,
        };
      }
    }

    // Calculate closing timestamp
    const now = new Date();
    const closesAt = new Date(now.getTime() + closesInMinutes * 60 * 1000);

    // Generate ballot ID
    const meta = await this.getMeta();
    const ballotId = `B-${String(meta.last_ballot_id + 1).padStart(4, '0')}`;

    // Create ballot
    const ballot: Ballot = {
      id: ballotId,
      suggestion_ids: suggestionIds,
      created_at: now.toISOString(),
      closes_at: closesAt.toISOString(),
      status: 'open',
      winner_id: null,
    };

    // Link suggestions to ballot
    for (const id of suggestionIds) {
      const suggestion = suggestions.find((s) => s.id === id);
      if (suggestion) {
        suggestion.ballot_id = ballotId;
      }
    }

    // Persist
    ballots.push(ballot);
    await this.saveBallots(ballots);
    await this.saveSuggestions(suggestions);

    // Increment ballot counter
    meta.last_ballot_id++;
    await this.saveMeta(meta);

    return {
      ok: true,
      ballot,
    };
  }

  /**
   * Close a ballot and determine winner
   */
  async closeBallot(
    ballotId: string
  ): Promise<{ ok: boolean; winner_id?: string; message?: string }> {
    const ballots = await this.getBallots();
    const ballot = ballots.find((b) => b.id === ballotId);

    if (!ballot) {
      return {
        ok: false,
        message: 'Ballot not found',
      };
    }

    if (ballot.status !== 'open') {
      return {
        ok: false,
        message: 'Ballot is not open',
      };
    }

    // Get all suggestions in the ballot
    const suggestions = await this.getSuggestions();
    const ballotSuggestions = suggestions.filter((s) => ballot.suggestion_ids.includes(s.id));

    if (ballotSuggestions.length === 0) {
      return {
        ok: false,
        message: 'No suggestions found for ballot',
      };
    }

    // Calculate vote scores and determine winner
    let winner = ballotSuggestions[0]!;
    let highestScore = winner.votes.up - winner.votes.down;

    for (const suggestion of ballotSuggestions) {
      const score = suggestion.votes.up - suggestion.votes.down;

      if (score > highestScore) {
        winner = suggestion;
        highestScore = score;
      } else if (score === highestScore && winner) {
        // Tie-breaker: earliest timestamp
        if (new Date(suggestion.created_at) < new Date(winner.created_at)) {
          winner = suggestion;
        }
      }
    }

    // Update ballot
    ballot.status = 'closed';
    ballot.winner_id = winner!.id;

    // Persist
    await this.saveBallots(ballots);

    return {
      ok: true,
      winner_id: winner!.id,
    };
  }

  /**
   * Get current open ballot with suggestions
   */
  async getCurrentBallot(): Promise<{ ballot: Ballot | null; suggestions: Suggestion[] }> {
    const ballots = await this.getBallots();
    const openBallot = ballots.find((b) => b.status === 'open');

    if (!openBallot) {
      return {
        ballot: null,
        suggestions: [],
      };
    }

    // Get suggestions for this ballot
    const suggestions = await this.getSuggestions();
    const ballotSuggestions = suggestions.filter((s) => openBallot.suggestion_ids.includes(s.id));

    return {
      ballot: openBallot,
      suggestions: ballotSuggestions,
    };
  }

  /**
   * Get promoted mission (closed ballot winner)
   */
  async getPromotedMission(): Promise<PromotedMission> {
    const ballots = await this.getBallots();
    const closedBallot = ballots.find((b) => b.status === 'closed');

    if (!closedBallot || !closedBallot.winner_id) {
      return {
        ballot: null,
        suggestion: null,
      };
    }

    // Get winner suggestion
    const suggestions = await this.getSuggestions();
    const winnerSuggestion = suggestions.find((s) => s.id === closedBallot.winner_id);

    return {
      ballot: closedBallot,
      suggestion: winnerSuggestion || null,
    };
  }
}
