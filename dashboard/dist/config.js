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
      "1388890276382380183"
    ],
    "userRoles": [
      "1388890274436223128"
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
      "Name": "Hỗ trợ Chung",
      "Emoji": "🔍",
      "Style": "Danger",
      "Description": "Mở để nhận hỗ trợ chung"
    },
    "questions": [
      {
        "PurchaseID": {
          "Question": "Hãy Miêu tả vấn đề của bạn?",
          "Placeholder": "Miêu tả vấn đề nhé",
          "Style": "Short",
          "Required": true,
          "maxLength": 1000
        }
      }
    ]
  },
  "TicketType2": {
    "name": "Nhận quyền Đăng Truyện",
    "channelName": "{ticket-id}-nhanquyendangtruyen-{user}-{priority}",
    "supportRoles": [
      "1388890276382380183"
    ],
    "userRoles": [
      "1388890274436223128"
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
      "Name": "Nhận quyền Đăng Truyện",
      "Emoji": "💻",
      "Style": "Primary",
      "Description": "Dành cho Các nhóm dịch có thể yêu cầu Quyền Lợi"
    },
    "questions": [
      {
        "RequiredIMG": {
          "Question": "Gửi File Drive truyện bạn dịch lên nha!",
          "Placeholder": "",
          "Style": "Short",
          "Required": true,
          "maxLength": 1000
        }
      }
    ]
  }
}
    }
};