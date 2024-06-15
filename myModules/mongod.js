const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config();

main();

const eventSchema = mongoose.Schema({
  eventType: String,
  year:Number,
  month:String,
  date:Number,
  eventTitle: String,
  eventDescription: String,
  faculty_name:String,
  faculty_email:String,
  course:String
});

const logInSchema = mongoose.Schema({
  name:{
      type:String,
      required:true
  },
  password:{
      type:String,
      required:true
  },
  rollno:{
      type:Number,
      required:false
  },
  Branch:{
      type:String,
      required:false
  },
  email:{
      type:String,
      required:true
  },
  userType:{
      type:String,
      required:true
  },
  course:{
    type:Array,
    required:true
  }
});

const dependentSubjectSchema = mongoose.Schema({
  subject:{
    type: String,
    required:true
  },
  depSubjects:{
    type:Array,
    required:true,
  }
});

async function main() {
  await mongoose.connect(`mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.vnuefms.mongodb.net/calendarDB?retryWrites=true&w=majority&appName=Cluster0`);
}

const Event = mongoose.model('Event',eventSchema);

const LogInCollection = mongoose.model('User',logInSchema);

const Sub_dependencies = mongoose.model("dependent_subject", dependentSubjectSchema);

module.exports = { LogInCollection, Event, Sub_dependencies };

