const axios = require('axios').default;
const { ErrorType, DataType } = require('./constants/types');

async function getData(playerID, dataType, matchID = null) {
  let data;
  const config = global.config.Valorant;

  try {
    if (dataType === DataType.PROFILE) {
      data = await axios.get(config.TrackerProfile + playerID);
    } else if (dataType === DataType.RANK) {
      data = await axios.get(config.TrackerProfile + playerID + config.RankHeader);
    } else if (dataType === DataType.COMP_OVERVIEW) {
      // prettier-ignore
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'competitive' + config.SourceHeader,
      );
    } else if (dataType === DataType.UNRATED_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'unrated'
      );
    } else if (dataType === DataType.SPIKE_RUSH_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'spikerush'
      );
    } else if (dataType === DataType.DEATHMATCH_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'deathmatch'
      );
    } else if (dataType === DataType.REPLICATION_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'replication'
      );
    } else if (dataType === DataType.ESCALATION_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'escalation'
      );
    } else if (dataType === DataType.SWIFTPLAY_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'swiftplay'
      );
    } else if (dataType === DataType.SNOWBALL_OVERVIEW) {
      data = await axios.get(
        config.TrackerProfile + playerID + config.OverviewHeader + 'snowball'
      );
    } else if (dataType === DataType.WEAPON) {
      data = await axios.get(config.TrackerProfile + playerID + config.WeaponHeader);
    } else if (dataType === DataType.SEASON_REPORT) {
      data = await axios.get(config.TrackerProfile + playerID + config.SeasonReport);
    } else if (dataType === DataType.MATCH) {
      data = await axios.get(config.TrackerMatch + `riot/${playerID}`);
    } else if (dataType === DataType.MATCH_INFO) {
      data = await axios.get(config.TrackerMatch + matchID);
    } else {
      console.error('You should not reach here. There is a typo in the code :|');
    }
  } catch (error) {
    if (error.response && error.response.status === 403) {
      return ErrorType.FORBIDDEN;
    }
    return ErrorType.DEFAULT;
  }

  return data;
}

module.exports = { getData };
