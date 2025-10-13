// Generated from config.yml - DO NOT EDIT DIRECTLY
window.DASHBOARD_CONFIG = {
    API_URL: 'http://free01.asakamc.vn:20042/api',
    CLIENT_URL: 'http://free01.asakamc.vn:20042',
    TIMEZONE: 'Asia/Ho_Chi_Minh',
    DISCORD: {
        CLIENT_ID: '1372420632628822057',
        REDIRECT_URI: 'http://free01.asakamc.vn:20042/api/auth/callback',
        GUILD_ID: '1388889326309605488'
    },
    PERMISSIONS: {
        Dashboard: {
            Login: ["1388890272766623784","1388890276382380183"],
            Usage: ["1388890272766623784","1388890276382380183"],
            Settings: ["1388890272766623784","1388890276382380183"],
            Embed: ["1388890272766623784","1388890276382380183"]
        }
    },
    TICKETS: {
        TYPES: {
  "TicketType1": {
    "name": "General Support",
    "channelName": "{ticket-id}-General-{user}-{priority}",
    "supportRoles": [
      "ROLE_ID"
    ],
    "userRoles": [],
    "claiming": {
      "enabled": true,
      "restrictResponse": true,
      "announceClaim": true,
      "button": {
        "Name": "Claim Ticket",
        "Emoji": "🎫",
        "Style": "Secondary"
      }
    },
    "button": {
      "Name": "General Support",
      "Emoji": "🔍",
      "Style": "Danger",
      "Description": "Open to receive general support"
    },
    "questions": [
      {
        "PurchaseID": {
          "Question": "Do you have a transaction ID?",
          "Placeholder": "TBX-wdUGVApxKSMXham",
          "Style": "Short",
          "Required": false,
          "maxLength": 1000
        }
      }
    ]
  },
  "TicketType2": {
    "name": "Technical Support",
    "channelName": "{ticket-id}-Technical-{user}-{priority}",
    "supportRoles": [
      "ROLE_ID"
    ],
    "userRoles": [
      ""
    ],
    "claiming": {
      "enabled": true,
      "restrictResponse": true,
      "announceClaim": true,
      "button": {
        "Name": "Claim Ticket",
        "Emoji": "🎫",
        "Style": "Secondary"
      }
    },
    "button": {
      "Name": "Technical Support",
      "Emoji": "💻",
      "Style": "Primary",
      "Description": "Technical questions and issues"
    },
    "questions": []
  }
}
    }
};