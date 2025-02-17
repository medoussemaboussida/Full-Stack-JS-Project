const userModel = require('../model/user');
const bcrypt = require("bcrypt"); 
const jwt=require("jsonwebtoken")

//jwt config
const maxAge=2 * 60 ; //2mins
const createtoken=(id)=>{
return jwt.sign({id},'randa',{expiresIn:maxAge})
}

//signup
module.exports.addUser = async (req,res) => { 

    try{
        console.log(req.body);
        const{ username , dob , email ,role, password }=req.body;
        const etatUser = "Actif"
        const photoUser= "Null"
        const user = new userModel({username , email , dob , password , role , etat:etatUser , user_photo:photoUser});
        const userAdded = await user.save()
        res.status(201).json(userAdded);
    }catch(err){
        res.status(500).json({message: err.message})
    }
} 

//login
module.exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Trouver l'utilisateur par email
        const user = await userModel.findOne({ email });
        if (user) {
            const auth = await bcrypt.compare(password, user.password);
            if (auth) {
                // Générer le token
                const token = createtoken(user._id);

                // Définir le cookie avec le token
                res.cookie('jwt-token', token, { httpOnly: true, maxAge: maxAge * 1000 });

                // Retourner l'utilisateur et le token
                return res.status(200).json({ user, token });
            }
            throw new Error("Incorrect password");
        }
        throw new Error("Incorrect email");
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};
