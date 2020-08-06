//jshint esversion:6
require("dotenv").config();
const express= require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose= require("mongoose");
const session = require('express-session')
const passportLocalMongoose=require("passport-local-mongoose");
const passport=require("passport");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate= require("mongoose-findorcreate");
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

mongoose.connect("mongodb://localhost:27017/userDB",{useNewUrlParser:true, useFindAndModify:false, useCreateIndex:true, useUnifiedTopology:true, autoIndex:false});
const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret: String
});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=mongoose.model("user", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
  //  console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

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
  // if(req.isAuthenticated()){res.render("secrets");}
  // else{
  //   res.redirect("/");
  // }
User.find({"secret":{$ne:null}}, (err, foundUsers)=>{
  if(err){
    console.log(err);
  }
  else{
    if(foundUsers)
    {
      res.render("secrets", {userWithSecrets: foundUsers});
    }
  }
})

});
app.get("/logout", (req,res)=>{
  req.logout();
  res.redirect("/");
})
app.get("/submit", (req,res)=>{
  if(req.isAuthenticated()){res.render("submit");}
  else{
    res.redirect("/");
  }
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function(req, res) {

      res.redirect('/secrets');
    });

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
app.post("/submit", (req,res)=>{
  const summittedSecret=req.body.secret;
  console.log(req.user.id);
  User.findById(req.user.id, (err, foundUser)=>{
    if(err){
      console.log(err);
    }
    else{
      if(foundUser)
      {
        foundUser.secret=summittedSecret;
        foundUser.save(()=>{
          res.redirect("/secrets");
        });
      }
    }
  })
})

app.listen(3000,()=>{
  console.log("Server Started on port 3000");
})
