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
    "name": "Hỗ trợ Chung",
    "channelName": "{ticket-id}-Chung-{user}-{priority}",
    "supportRoles": [
      "ROLE_ID"
    ],
    "userRoles": [],
    "claiming": {
      "enabled": true,
      "restrictResponse": true,
      "announceClaim": true,
      "button": {
        "Name": "Nhận Phiếu",
        "Emoji": "🎫",
        "Style": "Secondary"
      }
    },
    "button": {
      "Name": "Hỗ trợ Chung",
      "Emoji": "🔍",
      "Style": "Danger",
      "Description": "Mở để nhận hỗ trợ chung"
    },
    "questions": [
      {
        "PurchaseID": {
          "Question": "Bạn có mã giao dịch không?",
          "Placeholder": "TBX-wdUGVApxKSMXham",
          "Style": "Short",
          "Required": false,
          "maxLength": 1000
        }
      }
    ]
  },
  "TicketType2": {
    "name": "Hỗ trợ Kỹ thuật",
    "channelName": "{ticket-id}-Kythuat-{user}-{priority}",
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
        "Name": "Nhận Phiếu",
        "Emoji": "🎫",
        "Style": "Secondary"
      }
    },
    "button": {
      "Name": "Hỗ trợ Kỹ thuật",
      "Emoji": "💻",
      "Style": "Primary",
      "Description": "Các câu hỏi và vấn đề kỹ thuật"
    },
    "questions": []
  }
}
    }
};