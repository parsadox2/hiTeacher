const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const bodyParser = require('body-parser');
const expressSession = require('express-session');
const bcrypt = require('bcrypt')
const helmet = require('helmet')
const xss = require('xss')
const ai = require('./ai')
const app = express();


mongoose.connect('mongodb://localhost:27017/hiteacher')

let userSchema = new mongoose.Schema({
    _id : Number , 
    username : String , 
    password : String , 
    email : String ,
    type: Number ,
}, { versionKey : false});

let user = mongoose.model("User" , userSchema);

app.use(helmet.xssFilter())
app.use(bodyParser.json())
app.use(expressSession({secret : "hfeliushuebvr8bae8yvli7yayybegvku7kaygvfyvyeasuvevgbgvfy" , 
    resave : true , 
    saveUninitialized : true
}))

app.get('/', (req, res) => {
    return res.json({ "message": "home page" }).end();
});

app.post('/register' , async(req , res) =>{
    const username = xss(req.body.name)
    const password = xss(req.body.password)
    const email = xss(req.body.email)
    const checkUsername = await user.find({username : username})
    if(!checkUsername.length)
    {
        const passwordHash = bcrypt.hashSync(password , 10)
        const lastUser = await user.find().sort('-_id').limit(1)
        const newUser = new user({
            _id : ai.setAi(lastUser) ,
            username : username ,
            password : passwordHash ,
            email : email ,
            phonenumber : {type : String , require : true} , 
            type : 0
        })
        newUser.save()
        return res.status(201).json({"message" : "user successfuly created"}).end()
    }
    else
    {
        return res.status(406).json({"message" :"this username is used by another user"}).end()
    }
})

app.post('/login' , async(req , res)=>{
    if(req.session.user)
    {
        return res.status(409).json({message : "u logged in before"}).end()
    }
    const username = req.body.username
    const password = req.body.password

    const checkUser = await user.findOne({username : username})
    if(checkUser)
    {
        const checkpassword = bcrypt.compareSync(password , checkUser.password)
        if(checkpassword)
        {
            req.session.user = {username: username , email : checkUser.email}
            return res.status(202).json({message : "u logged in successfuly"}).end()
        }
        else
        {
            return res.status(409).json({message : "the password is incorrect"}).end()
        }
    }
    else
    {
        return res.status(406).json({"message" :"this username is not used by any user"}).end()
    }
})

app.post('/beTeacher' , (req , res)=>{
    if(!req.session.user)
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
    
})

app.get('/logout' , (req , res) =>{
    if(req.session.user)
    {
        req.session.user = null
        return res.status(202).json({message : "you logged out successfuly"}).end()
    }
    else
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
})

app.delete('/deleteaccount/:password' , async(req , res) =>{
    const password = req.body.password
    if(!req.session.user)
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
    let checkUsername = await user.findOne({username : req.session.user.username})
    if(checkUsername)
    {
        let checkPassword = bcrypt.compareSync(password , checkUsername.password)
        if(checkPassword)
        {
            req.session.user = null;
            await user.deleteOne({username :checkUsername.username}).then(()=>{
                res.status(204).send();
            })
        }
        else
        {
            return res.status(409).json({message : "the password is incorrect"})
        }
    }
})

app.listen(3000);