const { Schema, model } = require('mongoose');

const customRoleSettingsSchema = new Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
    },
    onExpireAction: {
        type: String,
        enum: ['deleteRole', 'removeMembers'],
        default: 'removeMembers',
    },
    defaultPermissions: {
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

module.exports = model('CustomRoleSettings', customRoleSettingsSchema);
