const { Schema, model } = require('mongoose');

const customRoleSchema = new Schema({
    roleId: {
        type: String,
        required: true,
        unique: true,
    },
    guildId: {
        type: String,
        required: true,
    },
    authorId: {
        type: String,
        required: true,
    },
    maxUsers: {
        type: Number,
        default: 1,
    },
    expiresAt: {
        type: Date,
        default: null,
    },
    permissions: {
        editName: {
            type: Boolean,
            default: false,
        },
        editIcon: {
            type: Boolean,
            default: false,
        },
        editColor: {
            type: Boolean,
            default: false,
        },
        manageMembers: {
            type: Boolean,
            default: false,
        },
        mentionable: {
            type: Boolean,
            default: false,
        },
    },
});

module.exports = model('CustomRole', customRoleSchema);
