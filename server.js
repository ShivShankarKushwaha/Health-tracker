require("dotenv").config();
const express = require("express");
const bp = require("body-parser");
const cookieParser = require("cookie-parser");
const app = express();
const session = require("express-session");
const EmailValidator = require("email-validator");
const { User, Notes } = require("./Database");
const port = process.env.PORT || 5500;
const SECRET = process.env.SESSION_SECRET;
const bcrypt = require("bcrypt");
const Mailer = require("./SendMail");
const PinGenerator = require("./OTP");
const jwt = require('jsonwebtoken'); 

app.use(bp.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
if (process.env.NODE_ENV === 'production') {
    app.use(express.static('build'));
}

app.use(
    session({
        secret: SECRET,
        resave: false,
        saveUninitialized: true,
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 5,
        },
    }),
);

///////////////////////////////////////////////// google login ////////////////////////

const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const fs = require("fs");

const config = JSON.parse(fs.readFileSync("config.json", "utf8"));
const googleConfig = config.google;

app.use(passport.initialize());
app.use(passport.session());

passport.use(
    new GoogleStrategy(
        {
            clientID: googleConfig.web.client_id,
            clientSecret: googleConfig.web.client_secret,
            callbackURL: googleConfig.web.redirect_uris[0],
        },
        (accessToken, refreshToken, profile, done) =>
        {
            console.log("inside passport.use()");
            console.log(accessToken);
            console.log(refreshToken);
            console.log(profile);
            console.log("returning from passport.use()");
            return done(null, profile);
        },
    ),
);
passport.serializeUser((user, done) =>
{
    done(null, user);
});
passport.deserializeUser((user, done) =>
{
    done(null, user);
});
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// Google OAuth callback
app.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/failedlogin" }), (req, res) =>
{
    console.log("inside callback");
    // Set the user profile data in the session
    req.session.user = req.user;
    req.session.email = req.user.emails[0].value;
    // Successful authentication, redirect to a success page or perform other actions
    res.redirect("/success");
});

app.get("/failedlogin", (re, res) =>
{
    return res.json({ status: "Login Uncessfull" });
});
app.get("/success", async (req, res) =>
{
    let email = req.session.user.emails[0].value;
    let data = await User.findOne({ email: email });
    if (!data) {
        let password = PinGenerator();
        password = encryption(password);
        let saveuser = new User({ name: req.session.user.displayName, email: email, password: password });
        let responce = await saveuser.save();
        let note = new Notes({ email: req.session.email, target: { exercize: 30, running: 30, water: 4000 } });
        await note.save();
        console.log("responce /success", responce);
    }
    res.clearCookie('user');
    res.cookie('user', signjwt(req.session.email),{maxAge:3*24*60*60*1000});
    // return res.redirect(`${process.env.FRONTEND}/dashboard`);
    return res.redirect(`/dashboard`);
});

//////////////////////////////////////// google login end ////////////////////////////////////////

function encryption(data)
{
    return bcrypt.hashSync(data, 10);
}
function comparepass(data, stored)
{
    return bcrypt.compareSync(data, stored);
}
function signjwt(data)
{
    const payload = { data };
    let token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '3d' });
    return token;
}
function verifyjwt(data)
{
    let verified = jwt.verify(data, process.env.JWT_SECRET, (err, decoded) =>
    {
        if (err) 
        {
            return false;
        }
        else 
        {
            return decoded;
        }
    })
    return verified;
}
app.get("/", async (req, res) =>
{
    res.send("hello");
});
app.post("/initializeuser", (req, res) =>
{
    console.log('inside intializeuser');
    let token = req.body.user.split('=')[1];;
    console.log('recieved token',token);
    let data = verifyjwt(token);
    console.log('inside initalize user',data);
    if (data) 
    {
        req.session.email = data.data;
        return res.status(200).json({message:'user found'});
    }
    res.status(300).json({message:'user not found'});
})
app.post("/sign", async (req, res) =>
{
    let { name, email, password } = req.body;
    console.log(name, email, password);
    if (!EmailValidator.validate(email)) {
        res.json({ status: 401, message: "Email Not Accepted" });
        return;
    }
    let pass = encryption(password);
    let alreadyuser = await User.findOne({ email: email });
    if (alreadyuser) {
        return res.status(300).json({ message: "user already Exist" });
    }
    req.session.name = name;
    req.session.useremail = email;
    req.session.password = pass;
    let mailcheck = Mailer(email);
    console.log("MAIL CHECK /sign:", mailcheck);
    req.session.otp = mailcheck;
    res.status(200).json({ message: "data recieved successfully" });
});
app.post("/login", async (req, res) =>
{
    let { email, password } = req.body;
    console.log(req.body);
    let user = await User.findOne({ email: email }).exec();
    console.log(user);
    if (user) {
        let storedpass = user.password;
        console.log("compare password ", comparepass(password, storedpass));
        if (!comparepass(password, storedpass)) {
            return res.status(300).json({ status: "Incorrect Password" });
        }
        let name = req.session.name;
        req.session.email = email;
        res.clearCookie('user');
        const token = signjwt(req.session.email)
        res.cookie('user', token,{maxAge:3*24*60*60*1000});
        console.log('cookie saving',token);
        return res.status(200).json({ status: "Successfully Logged in" });
    }
    res.status(404).json({ status: "User Not found" });
});

app.get("/user", (req, res) =>
{
    if (req.session.user) {
        let photo = req.session.user.photos[0].value;
        // console.log('photos id ',req.session.user.photos[0].value);
        res.status(200).json({ img: photo });
    } else if (req.session.email) {
        return res.status(200).json({ img: "https://www.logolynx.com/images/logolynx/s_4b/4beebce89d681837ba2f4105ce43afac.png" });
    } else {
        res.status(500).json({ status: "No user found" });
    }
});

app.get("/userdata", async (req, res) =>
{
    if (req.session.user) {
        let name = req.session.user.displayName;
        let email = req.session.user.emails[0].value;
        console.log("/userdata ", name);
        return res.status(200).json({ name: name, email: email });
    } else if (req.session.email) {
        let name = await User.findOne({ email: req.session.email });
        name = name.name;
        req.session.name = name;
        return res.status(200).json({ name: req.session.name, email: req.session.email });
    } else {
        return res.status(300).json({ message: "No data found" });
    }
});
app.post("/verifyotp", async (req, res) =>
{
    let storedotp = req.session.otp;
    let otp = req.body.otp;
    console.log("inside verifyotp ", storedotp, otp);
    if (otp != storedotp) {
        return res.status(300).json({ message: "otp not verified" });
    }
    try {
        let user = new User({ name: req.session.name, email: req.session.useremail, password: req.session.password });
        req.session.email=req.session.useremail;
        await user.save();
        let note = new Notes({ email: req.session.email, target: { exercize: 30, running: 30, water: 4000 } });
        await note.save();
    } catch (error) {
        return res.status(300).json({ message: "Data not saved in database" });
    }
    res.clearCookie('user');
    res.cookie('user', signjwt(req.session.email),{maxAge:3*24*60*60*1000});
    return res.status(200).json({ message: "Otp Verified" });
});
app.post("/addnote", async (req, res) =>
{
    console.log("inside addnote");
    if (!req.session.user && !req.session.email) {
        console.log(req.session.email);
        console.log(req.session.user);
        return res.status(500).json({ message: "Note not added" });
    }
    req.body.email = req.session.email;
    let data = await Notes.findOne({ email: req.session.email });
    req.body.cured = false;
    if (!data) {
        let note = new Notes({ email: req.session.email, notes: [req.body] }); // Create a new Notes document with the note
        let response = await note.save();
        if (!response) {
            return res.status(300).json({ message: "Note not added" });
        }
        return res.status(200).json({ message: "Note successfully added" });
    }
    data = await Notes.updateOne({ email: req.session.email }, { $push: { notes: req.body } });
    console.log(data);
    res.status(200).json({ message: "Data successfully added" });
    console.log("returning from add note");
    return;
});
app.get("/getnotes", async (req, res) =>
{
    if (!req.session.user && !req.session.email) {
        console.log("inside getnote, not login");
        return res.status(500).json({ message: "No data found" });
    }
    let data = await Notes.findOne({ email: req.session.email });
    // let data = await Notes.findOne({ email: 'shivshankarkushwaha0000@gmail.com' });
    console.log("inside /getnote", req.session.email); // Moved the console.log here
    if (!data) {
        console.log("inside /getnote no data found");
        return res.status(300).json({ message: "No data found" });
    }
    return res.status(200).json(data.notes);
});

app.post("/deletenote", async (req, res) =>
{
    if (!req.session.user && !req.session.email) {
        return res.status(500).json({ message: "Please Login first" });
    }
    console.log("inside /deletenote", req.body.id);
    let data = await Notes.findOneAndUpdate({ email: req.session.email }, { $pull: { notes: { _id: req.body.id } } });
    console.log(data);
    if (!data) {
        return res.status(300).json({ message: "Note not deleted" });
    }
    return res.status(200).json({ message: "data deleted successfully" });
});

app.post("/updatedata", async (req, res) =>
{
    console.log("inside updatedata");
    if (!req.session.user && !req.session.email) {
        return res.status(500).json({ message: "Please Login first" });
    }

    try {
        // Find the user's data based on email
        // const user = await Notes.findOne({ email: 'shivshankarkushwaha0000@gmail.com' }).exec();
        const user = await Notes.findOne({ email: req.session.email }).exec();

        if (!user) {
            return res.status(300).json({ message: "User not found" });
        }

        // Find the index of the note to update based on _id
        const noteIndex = user.notes.findIndex((note) =>
        {
            // console.log(note._id, new ObjectId(req.body.id));
            return note._id.toString() == req.body.id;
        });
        console.log(noteIndex);
        if (noteIndex === -1) {
            return res.status(300).json({ message: "Note not found for update" });
        }

        // Update the note at the found index
        user.notes[noteIndex] = {
            _id: req.body.id,
            symptom: req.body.symptom,
            note: req.body.note,
            cured: req.body.cured,
            date: req.body.date,
        };

        // Save the updated user data
        await user.save();

        return res.status(200).json({ message: "Updated successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error: " + error });
    }
});

app.post("/requestappointment", async (req, res) =>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    console.log(req.body);
    req.body.status = false;
    let checknote = await Notes.findOne({ email: req.session.email });
    if (!checknote) {
        let note = new Notes({ email: req.session.email, appointments: req.body });
        let saved = await note.save();
        if (!saved) {
            return res.status(300).json({ message: "Request not appointed" });
        } else {
            return res.status(200).json({ message: "successfully appointed" });
        }
    }
    let data = await Notes.updateOne({ email: req.session.email }, { $push: { appointments: req.body } });
    if (!data) {
        return res.status(300).json({ message: "Request not appointed" });
    }
    return res.status(200).json({ message: "successfully appointed" });
});

app.get("/appointmentlist", async (req, res) =>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    let data = await Notes.findOne({ email: req.session.email });
    if (!data) {
        return res.status(300).json({ message: "no data found" });
    }
    data = data.appointments;
    return res.status(200).json(data);
});

app.post("/settarget", async (req, res) =>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    let data = await Notes.findOne({ email: req.session.email });
    if (!data) {
        return res.status(300).json({ message: "target not found" });
    }
    console.log(req.body);
    const updateFields = {};
    if (req.body.running != 0) {
        updateFields.running = req.body.running;
    }
    if (req.body.exercize !== 0) {
        updateFields.exercize = req.body.exercize;
    }
    if (req.body.water !== 0) {
        updateFields.water = req.body.water;
    }
    console.log('updating data ',updateFields);
    let response = await Notes.findOneAndUpdate({ email: req.session.email },{$set: {target: {...updateFields}}});

    if (!response) {
        return res.status(300).json({ message: "Target not updated", response });
    }

    return res.status(200).json({ message: "Target updated" });
});

app.get("/gettarget", async (req, res) =>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    let data = await Notes.findOne({ email: req.session.email });
    if (!data) {
        return res.status(300).json({ message: "target not found" });
    }
    data = data.target;
    return res.status(200).json(data);
});

app.post("/updatetoday",async(req,res)=>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    let currentDate = new Date();
    currentDate.setUTCHours(0);
    currentDate.setUTCMinutes(0);
    currentDate.setUTCSeconds(0);
    currentDate.setUTCMilliseconds(0);
    req.body.date =currentDate;
    console.log('date setting: ',req.body.date);

    let note = await Notes.findOne({email:req.session.email}).exec();
    let index = note.everyday.findIndex((item)=>
    {
        let comparedate = new Date(item.date);
        if(comparedate.getTime()==req.body.date.getTime())
        {
            item.running =req.body.running;
            item.exercize =req.body.exercize;
            item.water =req.body.water;
            return true;
        }
        return false;
    })
    if(index==-1)
    {
        let response = await note.updateOne({$push:{everyday:[req.body]}});
        if (!response) {
            return res.status(300).json({ message: 'Something error occurred' });
        }
        return res.status(200).json({ message: 'Successfully updated' });
    }
    else
    {
        note.everyday[index]=
        {
            date:req.body.date,
            exercize:req.body.exercize,
            running:req.body.running,
            water:req.body.water
        }
        let result =await note.save();
        if(result)
        {
            return res.status(200).json({message:'Updated Successfully'});
        }
        return res.status(300).json({message:'data not updated'});
    }
})

app.post("/gettoday",async(req,res)=>
{
    if (!req.session.email) {
        return res.status(500).json({ message: "Login First" });
    }
    var currentDate = new Date();
    if(req.body.date)
    {
        currentDate =new Date(req.body.date);
    }
    console.log(req.body.date);
    console.log('current date:',currentDate);
    currentDate.setUTCHours(0);
    currentDate.setUTCMinutes(0);
    currentDate.setUTCSeconds(0);
    currentDate.setUTCMilliseconds(0);
    let note = await Notes.findOne({ email: req.session.email }).exec();
    let data = note.everyday.find((item)=>{
        if(item.date.getTime()===currentDate.getTime())
        {
            return true;
        }
        return false;
    });
    console.log('data found?',data);
    if(!data)
    {
        return res.status(200).json({running:0,exercize:0,water:0});
    }
    return res.status(200).json(data);
    
})
app.post("/resetpassword",async(req,res)=>
{
    if(req.session.email)
    {
        let hashedpassword = encryption(req.body.password);
        let responce = await User.updateOne({email:req.session.email},{$set:{password:hashedpassword}});
        if(!responce)
        {
            return res.status(300).json({message:'Password not updated'})
        }
        else
        {
            return res.status(200).json({message:'paasword updated successfully'});
        }
    }
    else
    {
        return res.status(300).json({message:'User not found'});
    }
})
app.get("/logout", (req, res) =>
{
    try {
        req.session.destroy();
        res.clearCookie('user');
    } catch (error) {
        res.status(400).json({ status: "not logout" });
        return;
    }
    res.status(200).json({ status: "Successfully Logged Out" });
});

app.get('*',(req,res)=>
{
    try {
        res.sendFile(__dirname+'/build/index.html');
    } catch (error) {
        res.send('404 page not found');
    }
})
app.listen(port, () =>
{
    console.log(`server is running on http://localhost:${port}`);
});
