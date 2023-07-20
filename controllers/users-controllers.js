require("dotenv").config();
const { validationResult } = require("express-validator");
const HttpError = require("../models/http-error");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const https = require('https');
const Guest = require("../models/guest");
const User = require("../models/user");
const guest = require("../models/guest");
const nodeoutlook = require("nodejs-nodemailer-outlook");
//////////
const { google } = require('googleapis');

// const auth = new google.auth.GoogleAuth({
//   keyFile: '/google_oath.json',
//   scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/plus.business.manage'],
// });
// console.log(auth)

// var request = {
//   placeId: 'ChIJh_WzFH1BwBQRKxywcvDfSMs',
//   fields: ['name', 'rating', 'formatted_phone_number', 'geometry']
// };

// const service = new google.maps.places.PlacesService(map);
// service.getDetails(request, callback);

// function callback(place, status) {
//   if (status == google.maps.places.PlacesServiceStatus.OK) {
//       createMarker(place);
//       console.log(place)
//   }
// }
////////////////////
const get_dates = async (req, res, next) => {
  let guests;

  try {
    guests = await Guest.find({}, "-password");
  } catch (err) {
    const error = new HttpError(
      "Fetching users failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({ guests: guests.map((guest) => guest.toObject({ getters: true })) });
};
const get_reviews = async (req, res, next) => {

  const url = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${process.env.PLACE_ID}&key=${process.env.API_KEY}`;

  https.get(url, ress => {
    let data = '';
    ress.on('data', chunk => {
      data += chunk;
    });
    ress.on('end', () => {
      data = JSON.parse(data);
      // console.log(data);
      res.json({
        data,
      });
    })
  }).on('error', err => {
    console.log(err.message);
  })

};
const save_dates = async (req, res, next) => {

  const { guestname, guesttel, info, dates, room } = req.body;
  const createdGuest = new Guest({
    guestname: guestname,
    guesttel: guesttel,
    info: info,
    room: room,
    dates: dates
  });

  try {
    await createdGuest.save();
  } catch (err) {
    const error = new HttpError("Failed, please try again.", 500);
    console.log(err);
    return next(error);
  }
  res.status(201).json({ guest: createdGuest });
}

const deleteDate = async (req, res) => {

  const dateId = req.params.did;

  await Guest.deleteOne({ _id: dateId });

  res.status(200).json({ message: "Deleted date." });
};
//////
const signup = async (req, res, next) => {
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passed, please check your data.", 422)
    );
  }

  const { username, email, password } =
    req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    const error = new HttpError(
      "Signing up failed, please try again later.",
      500
    );
    return next(error);
  }


  if (existingUser) {
    const error = new HttpError(
      "User exists already, please login instead.",
      422
    );
    return next(error);
  }

  let hashedPassword;

  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (err) {
    const error = new HttpError("Could not create user", 500);

    return next(error);
  }

  const createdUser = new User({
    username, // name: name
    email,
    password: hashedPassword,

  });


  try {
    await createdUser.save();
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    console.log(err);
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: createdUser.id, username: createdUser.username },
      `${process.env.JWT_KEY}`,
      { expiresIn: "10h" }
    );
  } catch (err) {
    const error = new HttpError("Signing up failed, please try again.", 500);
    return next(error);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, username: createdUser.username, token: token });
};


const login = async (req, res, next) => {
  const { username, password } = req.body;

  let existingUser;

  try {
    existingUser = await User.findOne({ username: username });

  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }

  if (!existingUser) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let isValidPassword = false;
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password);

  } catch (err) {
    const error = new HttpError(
      "Could not log you in, please check your credentials and try again.",
      500
    );
    return next(error);
  }

  if (!isValidPassword) {
    const error = new HttpError(
      "Invalid credentials, could not log you in.",
      403
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      { userId: existingUser.id, username: existingUser.username },
      `${process.env.JWT_KEY}`,
      { expiresIn: "1h" }
    );

  } catch (err) {
    const error = new HttpError(
      "Logging in failed, please try again later.",
      500
    );
    return next(error);
  }
  res.json({
    user: existingUser,
    username: existingUser.username,
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });

};
const send_mail = async (req, res, next) => {
  const { guests } = req.body;
  console.log(req.body)

  try {
    nodeoutlook.sendEmail({
      auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_EMAIL_PASSWORD,
      },
      from: 'onalnihat@outlook.com',
      to: `onalnihat1986@gmail.com`,
      subject: `Monihomes misafir listesi`,
      text: guests,
      onError: (e) => console.log("error", e),
      onSuccess: (i) => {
        res.send(i);
        console.log("success", i);
      },
    });
  } catch (err) {
    const error = new HttpError("Error", 500);
    return next(error);
  }
};


exports.login = login;
exports.send_mail = send_mail;
exports.signup = signup;
exports.get_reviews = get_reviews;
exports.save_dates = save_dates;
exports.get_dates = get_dates;
exports.deleteDate = deleteDate;

// `
// From: monihomes
// Subject: Misafir kayitlari

// Message: ${message}
// `