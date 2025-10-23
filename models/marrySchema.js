const mongoose = require('mongoose');

const MarrySchema = new mongoose.Schema({
  authorid: { type: String, required: true },
  wifeid: { type: String, required: true },
  husbandid: { type: String, required: true },
  nhan: { type: String, default: null },
  loihua: { type: String, default: 'Yêu nhau suốt kiếp' },
  together: { type: Number, default: 0 },
});

module.exports = mongoose.model('Marry', MarrySchema);
