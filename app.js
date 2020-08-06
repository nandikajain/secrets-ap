//jshint esversion:6
require("dotenv").config();
const express= require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose= require("mongoose");
const session = require('express-session')
const passportLocalMongoose=require("passport-local-mongoose");
const passport=require("passport");

const app=express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true, useFindAndModify:false, useCreateIndex:true, useUnifiedTopology:true});
const userSchema= new mongoose.Schema({
  email:String,
  password:String
});
userSchema.plugin(passportLocalMongoose);

const User=mongoose.model("user", userSchema);
// use static authenticate method of model in LocalStrategy

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/",(req,res)=>{

  res.render("home");

});

app.get("/login", (req,res)=>{
  res.render("login");
});

app.get("/register",(req,res)=>{
  res.render("register");
});

app.get("/secrets", (req,res)=>{
  if(req.isAuthenticated()){res.render("secrets");}
  else{
    res.redirect("/");
  }
});
app.get("/logout", (req,res)=>{
  req.logout();
  res.redirect("/");
})

app.post("/register",(req,res)=>
{
  User.register({username: req.body.username},req.body.password,(err,user)=>{
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets");
      })
    }
  })


});

app.post("/login",(req,res)=>{
  const user=new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err)=>{
    if(err){res.redirect("/login");}
    else{
      passport.authenticate("local")(req,res,()=>{
        res.redirect("/secrets");
      })
    }
  })

});


app.listen(3000,()=>{
  console.log("Server Started on port 3000");
})
