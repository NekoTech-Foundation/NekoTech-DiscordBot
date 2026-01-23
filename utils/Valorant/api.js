const axios = require('axios').default;
const { ErrorType, DataType } = require('./constants/types');

async function getData(playerID, dataType, matchID = null) {
  const config = global.config.Valorant;

  // Primary Headers (for Public API)
  const publicHeaders = {
    'TRN-Api-Key': config.ApiKey,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
  };

  // Fallback Headers (for Internal/Web API - No API Key)
  const webHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Origin': 'https://tracker.gg',
    'Referer': 'https://tracker.gg/'
  };

  // Helper to construct URL based on DataType
  const buildUrl = (baseUrl) => {
    if (dataType === DataType.PROFILE) return baseUrl + playerID;
    if (dataType === DataType.RANK) return baseUrl + playerID + config.RankHeader;
    if (dataType === DataType.COMP_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'competitive' + config.SourceHeader;
    if (dataType === DataType.UNRATED_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'unrated';
    if (dataType === DataType.SPIKE_RUSH_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'spikerush';
    if (dataType === DataType.DEATHMATCH_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'deathmatch';
    if (dataType === DataType.REPLICATION_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'replication';
    if (dataType === DataType.ESCALATION_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'escalation';
    if (dataType === DataType.SWIFTPLAY_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'swiftplay';
    if (dataType === DataType.SNOWBALL_OVERVIEW) return baseUrl + playerID + config.OverviewHeader + 'snowball';
    if (dataType === DataType.WEAPON) return baseUrl + playerID + config.WeaponHeader;
    if (dataType === DataType.SEASON_REPORT) return baseUrl + playerID + config.SeasonReport;
    if (dataType === DataType.MATCH) return config.TrackerMatch.replace('public-api', 'api.tracker.gg/api') + `riot/${playerID}`; // Match endpoint logic implies using the specific match base
    if (dataType === DataType.MATCH_INFO) return config.TrackerMatch.replace('public-api', 'api.tracker.gg/api') + matchID;
    return null;
  };

  // Logic to handle fallback
  // Config has "https://public-api.tracker.gg/v2/valorant/standard/profile/riot/"
  const publicBase = config.TrackerProfile;
  const webBase = config.TrackerProfile.replace('public-api.tracker.gg', 'api.tracker.gg/api');

  // Match URLs need special handling since they are separate config entries
  let targetUrlPublic = buildUrl(publicBase);
  let targetUrlWeb = buildUrl(webBase);

  if (dataType === DataType.MATCH || dataType === DataType.MATCH_INFO) {
    targetUrlPublic = (dataType === DataType.MATCH) ? config.TrackerMatch + `riot/${playerID}` : config.TrackerMatch + matchID;
    targetUrlWeb = targetUrlPublic.replace('public-api.tracker.gg', 'api.tracker.gg/api');
  }

  try {
    // Attempt 1: Public API
    const res = await axios.get(targetUrlPublic, { headers: publicHeaders });
    return res;
  } catch (publicError) {
    if (publicError.response && (publicError.response.status === 401 || publicError.response.status === 403)) {
      // Log warning but try fallback
      console.warn(`[ValorantAPI] Public API failed (${publicError.response.status}). Attempting fallback to Internal API...`);

      try {
        // Attempt 2: Internal Web API
        const resWeb = await axios.get(targetUrlWeb, { headers: webHeaders });
        return resWeb;
      } catch (webError) {
        console.error(`[ValorantAPI] Fallback failed: ${webError.message}`);
        if (webError.response && webError.response.status === 403) return ErrorType.FORBIDDEN;
        return ErrorType.DEFAULT;
      }
    }

    console.error(`[ValorantAPI] Error: ${publicError.message}`);
    return ErrorType.DEFAULT;
  }
}

module.exports = { getData };
