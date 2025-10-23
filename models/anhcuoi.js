const mongoose = require('mongoose');

const AnhCuoiSchema = new mongoose.Schema({
  authorid: { type: String, required: true },
  wifeid: { type: String, required: true },
  anhcuoi: { type: String, required: true },
});

module.exports = mongoose.model('AnhCuoi', AnhCuoiSchema);
