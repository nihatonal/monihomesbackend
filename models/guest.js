const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const guestSchema = new Schema({
    guestname: { type: String, required: true },
    guesttel: { type: String, required: false },
    info: { type: String, required: false },
    room: { type: String, required: true },
    dates: [],
});


module.exports = mongoose.model('Guests', guestSchema);