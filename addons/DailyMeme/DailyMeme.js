const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const yaml = require('js-yaml');
const axios = require('axios');
const cron = require('node-cron');
const moment = require('moment-timezone');
const MemePost = require('./models/MemePost');

class DailyMeme {
  constructor(client) {
    this.client = client;
    this.config = null;
    this.cronJob = null;
  }

  debug(message) {
    if (this.config?.features?.debug) {
      console.log(`[DailyMeme Debug] ${message}`);
    }
  }

  error(message) {
    console.error(`[DailyMeme Error] ${message}`);
  }

  async init() {
    try {
      const configFile = await fs.readFile('./addons/DailyMeme/config.yml', 'utf8');
      this.config = yaml.load(configFile);
      
      this.validateConfig();
      await this.setupCronJob();
      await this.checkAndRestoreSchedule();
      
      this.debug('DailyMeme initialized successfully');
    } catch (error) {
      this.error(`Failed to initialize DailyMeme: ${error.message}`);
    }
  }

  validateConfig() {
    if (!this.config.memeChannelId) {
      throw new Error('Missing memeChannelId in configuration');
    }

    if (!this.config.features?.postTime) {
      throw new Error('Missing postTime in configuration');
    }

    if (!this.config.api?.endpoint) {
      throw new Error('Missing API endpoint in configuration');
    }

    this.debug('Config validation completed');
  }

  async checkAndRestoreSchedule() {
    try {
      const channel = await this.client.channels.fetch(this.config.memeChannelId);
      if (!channel) return;

      const lastPost = await MemePost.findOne({ 
        channelId: this.config.memeChannelId 
      }).sort({ lastPosted: -1 });

      if (lastPost) {
        const now = moment();
        const nextScheduled = moment(lastPost.nextScheduled);

        if (nextScheduled.isBefore(now)) {
          this.debug('Missed scheduled post, posting now...');
          await this.postDailyMeme();
        } else {
          this.debug(`Next post scheduled for ${nextScheduled.format()}`);
        }
      }
    } catch (error) {
      this.error(`Failed to restore schedule: ${error.message}`);
    }
  }

  calculateNextPostTime() {
    const [hour, minute] = this.config.features.postTime.split(':');
    const timezone = this.config.features.timezone || 'UTC';
    const now = moment().tz(timezone);
    let nextPost = moment().tz(timezone).set({
      hour: parseInt(hour),
      minute: parseInt(minute),
      second: 0,
      millisecond: 0
    });

    if (nextPost.isSameOrBefore(now)) {
      nextPost = nextPost.add(1, 'day');
    }

    return nextPost.toDate();
  }

  async setupCronJob() {
    const [hour, minute] = this.config.features.postTime.split(':');
    const timezone = this.config.features.timezone || 'UTC';
    
    const schedule = `${minute} ${hour} * * *`;
    
    this.cronJob = cron.schedule(schedule, async () => {
      try {
        await this.postDailyMeme();
      } catch (error) {
        this.error(`Failed to post daily meme: ${error.message}`);
      }
    }, {
      timezone: timezone
    });

    this.debug(`Cron job scheduled for ${this.config.features.postTime} ${timezone}`);
  }

  async fetchMeme() {
    try {
      const subreddits = this.config.api.subreddits;
      const randomSubreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
      const endpoint = `${this.config.api.endpoint}/${randomSubreddit}`;
      
      const response = await axios.get(endpoint);
      const meme = response.data;

      if (meme.nsfw && !this.config.api.nsfw) {
        this.debug('NSFW meme detected, fetching another one');
        return this.fetchMeme();
      }

      return meme;
    } catch (error) {
      throw new Error(`Failed to fetch meme: ${error.message}`);
    }
  }

  async postDailyMeme() {
    try {
      const channel = await this.client.channels.fetch(this.config.memeChannelId);
      if (!channel) {
        throw new Error(`Channel with ID ${this.config.memeChannelId} not found`);
      }

      const meme = await this.fetchMeme();
      const embed = new EmbedBuilder()
        .setColor(this.config.embed.color || '#FF4500')
        .setTitle(meme.title)
        .setURL(meme.postLink)
        .setImage(meme.url)
        .setTimestamp();

      if (this.config.embed.showStats) {
        embed.addFields([
          { name: '⬆️ Upvotes', value: meme.ups.toString(), inline: true },
          { name: '💬 Comments', value: `r/${meme.subreddit}`, inline: true }
        ]);
      }

      if (this.config.embed.footer) {
        embed.setFooter({ text: this.config.embed.footer });
      }

      const message = await channel.send({ embeds: [embed] });
      
      if (this.config.features?.autoReact?.enabled) {
        try {
          const reactions = this.config.features.autoReact.reactions || ['😂'];
          for (const reaction of reactions) {
            await message.react(reaction);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          this.debug('Added auto-reactions to meme post');
        } catch (reactionError) {
          this.error(`Failed to add reactions: ${reactionError.message}`);
        }
      }

      await MemePost.create({
        guildId: channel.guild.id,
        channelId: channel.id,
        lastPosted: new Date(),
        nextScheduled: this.calculateNextPostTime(),
        memeData: {
          title: meme.title,
          postLink: meme.postLink,
          subreddit: meme.subreddit,
          url: meme.url,
          ups: meme.ups,
          nsfw: meme.nsfw
        }
      });

      this.debug(`Posted meme: ${meme.title}`);
    } catch (error) {
      this.error(`Failed to post meme: ${error.message}`);
    }
  }

  async getPostHistory(limit = 10) {
    try {
      return await MemePost.find({
        channelId: this.config.memeChannelId
      })
      .sort({ lastPosted: -1 })
      .limit(limit);
    } catch (error) {
      this.error(`Failed to get post history: ${error.message}`);
      return [];
    }
  }
}

module.exports.run = async (client) => {
  const dailyMeme = new DailyMeme(client);
  await dailyMeme.init();
}; 