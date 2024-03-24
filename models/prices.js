const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const priceSchema = new Schema({
    price:[]
});


module.exports = mongoose.model('Prices', priceSchema);