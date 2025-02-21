const mongoose = require("mongoose");
const bcrypt = require("bcrypt"); 

const user = new mongoose.Schema({

    username :{ type: String , required : true},
    dob: { type: Date, required: true },
    email :{ type: String , required : true , unique : true},
    password: { type: String , required : true},
    role: { type: String , enum:[ 'student', 'psychiatrist','teacher','association_member'] , required : false},
    user_photo: {type : String , required: false},
    etat: {type : String , default:'Actif',required: false},
    speciality: { type: String , enum:[ 'A', 'B','P','TWIN','SAE','SE','BI','DS','IOSYS','SLEAM','SIM','NIDS','INFINI'] , required : true},
    level: { type: Number, required: true } ,
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
},
{
    timestamps:true
}
);


user.post("save", async function (req,res,next) {
    console.log("user created successfully");
    next();
});




const User = mongoose.model("User", user);

module.exports = User;