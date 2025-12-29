const axios = require('axios');
const allCharacters = require('./genshinCharacters.json');
const allHonkaiCharacters = require('./honkaiCharacters.json');

// Create a map for faster lookups
const characterMap = new Map(allCharacters.map(char => [char.id, char.name]));
const honkaiCharacterMap = new Map(allHonkaiCharacters.map(char => [char.id, char.name]));

async function getGenshinProfile(uid) {
  const url = `https://enka.network/api/uid/${uid}`;
  let response;
  try {
    response = await axios.get(url, {
      headers: {
        'User-Agent': 'NekoTech-DiscordBot/1.0'
      }
    });
  } catch (error) {
    if (error.response && (error.response.status === 404 || error.response.status === 400)) {
      console.log(`[TrackerUtils] Genshin profile for UID ${uid} not found on Enka.Network.`);
      return { error: 'Profile not found. Make sure the UID is correct and the in-game character showcase is not empty.' };
    }
    console.error(`[TrackerUtils] axios.get failed for Enka.Network UID ${uid}:`, error);
    return { error: 'An error occurred while fetching data from Enka.Network.' };
  }

  const data = response.data;

  if (!data.playerInfo) {
    return { error: 'Could not retrieve player information. The profile might be private.' };
  }

  const playerInfo = data.playerInfo;

  // Process showcased characters
  const characters = playerInfo.showAvatarInfoList
    ? playerInfo.showAvatarInfoList.map(char => {
        return char.nickname || characterMap.get(char.avatarId) || 'Unknown Character';
      })
    : [];

  // Determine profile picture
  let profilePicUrl = 'https://enka.network/ui/UI_AvatarIcon_Paimon.png'; // Default

  // Extract new data points
  const achievements = playerInfo.finishAchievementNum || 'N/A';
  const spiralAbyss = (playerInfo.towerFloorIndex && playerInfo.towerLevelIndex)
    ? `Floor ${playerInfo.towerFloorIndex}-${playerInfo.towerLevelIndex}`
    : 'N/A';

  return {
    username: playerInfo.nickname,
    adventureRank: playerInfo.level,
    worldLevel: playerInfo.worldLevel,
    signature: playerInfo.signature || 'No signature.',
    showcasedCharacters: characters.length > 0 ? characters.join(', ') : 'None',
    profilePictureUrl: profilePicUrl,
    achievements: achievements,
    spiralAbyss: spiralAbyss
  };
}

async function getHonkaiProfile(uid) {
  const url = `https://enka.network/api/hsr/uid/${uid}`;
  let response;
  try {
    response = await axios.get(url, {
      headers: {
        'User-Agent': 'NekoTech-DiscordBot/1.0'
      }
    });
  } catch (error) {
    if (error.response && (error.response.status === 404 || error.response.status === 400)) {
      console.log(`[TrackerUtils] HSR profile for UID ${uid} not found on Enka.Network.`);
      return { error: 'Profile not found. Make sure the UID is correct and the in-game character showcase is not empty.' };
    }
    console.error(`[TrackerUtils] axios.get failed for Enka.Network HSR UID ${uid}:`, error);
    return { error: 'An error occurred while fetching data from Enka.Network.' };
  }

  const data = response.data;

  if (!data.player) {
    // It seems the structure can sometimes be different, let's try to handle the other one too.
    // This is the structure I was trying to use before.
    if (data.detailInfo) {
        const playerInfo = data.detailInfo;
        const characters = playerInfo.avatarDetailList
            ? playerInfo.avatarDetailList.map(char => honkaiCharacterMap.get(char.id) || 'Unknown') 
            : [];

        return {
            username: playerInfo.nickname,
            trailblazeLevel: playerInfo.level,
            equilibriumLevel: playerInfo.worldLevel,
            signature: playerInfo.signature || 'No signature.',
            showcasedCharacters: characters.length > 0 ? characters.join(', ') : 'None',
            achievements: playerInfo.recordInfo ? playerInfo.recordInfo.achievementCount : 'N/A',
            simulatedUniverse: playerInfo.recordInfo ? playerInfo.recordInfo.maxRogueChallengeScore : 'N/A',
            profilePictureUrl: `https://enka.network/ui/hsr/avatar/${playerInfo.headIcon}.png`
        };
    }
    return { error: 'Could not retrieve player information. The profile might be private or the API structure is unexpected.' };
  }

  const playerInfo = data.player;
  const characters = data.characters ? data.characters.map(char => honkaiCharacterMap.get(char.id) || 'Unknown') : [];

  return {
    username: playerInfo.nickname,
    trailblazeLevel: playerInfo.level,
    equilibriumLevel: playerInfo.worldLevel,
    signature: playerInfo.signature || 'No signature.',
    showcasedCharacters: characters.length > 0 ? characters.join(', ') : 'None',
    achievements: playerInfo.spaceInfo ? playerInfo.spaceInfo.achievementCount : 'N/A',
    simulatedUniverse: playerInfo.spaceInfo && playerInfo.spaceInfo.challengeHerta ? playerInfo.spaceInfo.challengeHerta.score : 'N/A',
    profilePictureUrl: playerInfo.avatar ? playerInfo.avatar.icon : null
  };
}

module.exports = {
  getGenshinProfile,
  getHonkaiProfile
};
