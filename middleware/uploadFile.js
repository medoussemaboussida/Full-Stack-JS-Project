const multer = require("multer");
const path =require('path');
const fs = require('fs')
var storage = multer.diskStorage({
destination: function (req,file, cb)
{
    cb(null,'uploads')
},
filename: function (req, file, cb){
    const UploadPath ='uploads';
    const originalName = file.originalname;
    console.log(file.originalname)
    const fileExtension = path.extname(originalName);
    let fileName = originalName;
//verifier l'existance
let fileIndex= 1;
while(fs.existsSync(path.join(UploadPath, fileName)))
{
    const baseName = path.basename(originalName, fileExtension);
    fileName = `${baseName}_${fileIndex}${fileExtension}`;
    fileIndex++;
}
cb(null,fileName);

}
})

var uploadFile =multer({storage: storage});
module.exports = uploadFile;