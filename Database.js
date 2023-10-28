require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_LINK).then(() => {
  console.log('Database connected');
});

const schema = new mongoose.Schema({
  name: String,
  email: String,
  password:String,
  doctor: {
    type: Boolean,
    default: false,
  }
});



const noteschema = new mongoose.Schema({
  email: String,
  notes: [
    {
      symptom: String,
      note: String,
      cured: Boolean,
      date: Date,
    }
  ],
  appointments:[
    {
      date:Date,
      time:String,
      message:String,
      status:Boolean,
      doctor:String,
    }
  ],
  target:
  {
    running:Number,
    exercize:Number,
    water:Number
  },
  everyday:[
    {
      date:Date,
      running: Number,
      exercize: Number,
      water: Number
    }
  ]
});
const Notes =mongoose.model('note',noteschema);
const User = mongoose.model('user', schema);
module.exports ={User,Notes};
