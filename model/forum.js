const mongoose = require("mongoose");
const forumSchema = new mongoose.Schema({

    title :{ type: String , required : true },
    description :{ type: String , required : true },
    forum_photo: {type : String , required: false},
    status: { type: String, enum: ["actif", "inactif"], default: "actif" },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },   
    anonymous: { type: Boolean } 

},
{
    timestamps:true
}
);


forumSchema.post("save", async function (req,res,next) {
    console.log("forum topic created successfully");
    next();
});


const Forum = mongoose.model("Forum", forumSchema);

module.exports = Forum;