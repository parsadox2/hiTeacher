import express, { request } from 'express'
import mongoose from 'mongoose';
import bodyParser from 'body-parser';
import expressSession from 'express-session'
import bcrypt from 'bcrypt'
import helmet from 'helmet';
import { setAi } from './ai.js';

const app = express();

mongoose.connect('mongodb://localhost:27017/hiteacher')

let userSchema = new mongoose.Schema({
    _id : Number , 
    username : String , 
    password : String , 
    email : String ,
    type: Number ,
}, { versionKey : false , validateBeforeSave: true});

let categorySchema = new mongoose.Schema({
    _id : Number , 
    name : String ,
})

let requestSchema = new mongoose.Schema({
    _id : Number ,
    user : Number,
    category : Number ,
})

let user = mongoose.model("User" , userSchema);
let category = mongoose.model("Category" , categorySchema)
let request = mongoose.model("Request" , requestSchema)

app.use(helmet.xssFilter())
app.use(bodyParser.json())
app.use(expressSession({
    secret : "hfeliushuebvr8bae8yvli7yayybegvku7kaygvfyvyeasuvevgbgvfy" , 
    resave : true , 
    saveUninitialized : true
}))

app.get('/', (req, res) => {
    return res.json({ "message": "home page" }).end();
});
app.post('/register' , async(req , res) =>{
    const username = req.body.username
    const password = req.body.password
    const email = req.body.email
    const checkUsername = await user.find({username : username})
    if(username.includes('<script>') || email.includes('<script>'))
    {
        return res.status(406).json({"message" :"not acceptable"}).end()
    }
    if(!checkUsername.length)
    {
        const passwordHash = bcrypt.hashSync(password , 10)
        const lastUser = await user.find().sort('-_id').limit(1)
        const newUser = new user({
            _id : setAi(lastUser) ,
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
app.put('/editUserInfo' , async(req , res) =>{
    if(!req.session.user)
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
    let username = req.body.username
    const password = req.body.password
    let email = req.body.email
    const checkUsername = await user.findOne({username : req.session.user.username})
    if(username.includes('<script>') || email.includes('<script>'))
    {
        return res.status(406).json({"message" :"not acceptable"}).end()
    }
    if(checkUsername)
    {
        if(bcrypt.compareSync(password , checkUsername.password))
        {
            if(username == '')
            {
                username = checkUsername.username
            }
            if(email == '')
            {
                email = checkUsername.email
            }
            await user.updateOne({username : username , email : email}).then(()=>{
                res.status(202).json({message : 'edited'})
            })
            
        }
        else
        {
            return res.status(400).json({"message" : "your password is not correct"})
        }
    }
    else
    {
        return res.status(406).json({"message" :"user not found"}).end()
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
app.post('/newcategory' , async(req , res) =>{
    if(!req.session.user)
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
    let userType = await user.findOne({username : req.session.user.username})
    if(!userType.type)
    {
        return res.status(409).json({message : "you are not logged in"}).end()
    }
    const {name} = req.body
    const lastCategory = await category.find().sort('-_id').limit(1)
    let newCategorey = new category({
        _id : setAi(lastCategory),
        name : name
    })
    newCategorey.save()
    return res.status(201).json({message : "the category is created"}).end()
})
app.post('/request' , async(req , res) =>{
    if(!req.session.user)
    {
        return res.status(409).json({message : "you re not logged in"}).end()
    }
    let userType = await user.findOne({username : req.session.user.username})
    if(userType)
    {
        if(userType.type == 1)
        {
            const {text , categoryId} = req.body
            const userCategory = category.findOne({_id : categoryId})
            const lastRequest = request.find().sort('-_id').limit(1)
            if(userCategory)
            {
                let newRequest = new request({
                    _id : setAi(lastRequest) , 
                    text : text,
                    user : userType._id , 
                    category : categoryId
                })
            }
            else
            {
                return res.status(409).json({message : "the category is not found"}).end()
            }
        }
        else
        {
            return res.status(409).json({message : "you are not admin"}).end()
        }
    }
    else
    {
        req.session.user = null
        return res.status(409).json({message : "your account has been deleted"}).end()
    }
})



app.listen(3000);