const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const requestSchema = new Schema(
    {
        from: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        to: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            required: true,
            default: 'pending',
            enum: ['pending', 'accepted', 'rejected']
        }
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Request', requestSchema);