import express from "express";
import { MongoClient, ObjectId } from "mongodb";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
const app = express();

import cors from "cors";
import { auth } from "./middleware/auth.js";
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
// import { ObjectId } from "mongodb";
const PORT = process.env.PORT;
const MONGO_URL = process.env.MONGO_URL;
const client = new MongoClient(MONGO_URL); // dial
async function connectdb() {
  await client.connect(); // call
  console.log("Mongo is connected !!!  ");
}
connectdb();

//POST RECIPE
app.post("/addrecipe", async function (request, response) {
  const data = request.body;
  console.log(data);
  const recipe = await client
    .db("kitchen")
    .collection("recipe")
    .insertMany(data);
  console.log(recipe);
  response.send(recipe);
});
app.get("/", async function (request, response) {
  response.send("hello🎉🎉");
});
//GET RECIPE
app.get("/allrecipe", auth, async function (request, response) {
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find({})
    .toArray();
  response.send(result);
});
//GET RECIPE BY ID
app.get("/:id", async function (request, response) {
  const { id } = request.params;
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .findOne({ _id: new ObjectId(id) });

  response.send(result);
});

//get recipy by cuisines
app.get("/cuisines/data", async function (request, response) {
  console.log(request.query);
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find(request.query)
    .toArray();

  response.send(result);
});

//get recipy by ingredients
app.get("/ingredients/data", async function (request, response) {
  console.log(request.query);

  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find(request.query)
    .toArray();

  response.send(result);
});
//get recipy by meals
app.get("/meals/data", async function (request, response) {
  console.log(request.query);

  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find(request.query)
    .toArray();

  response.send(result);
});
//ger quick recipes
app.get("/quick/data", async function (request, response) {
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find({
      cookingtime: { $in: ["10mins", "15mins", "20mins", "25mins", "30mins"] },
    })
    .toArray();

  response.send(result);
});

//ger high rated recipes
app.get("/rated/data", async function (request, response) {
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find({
      rating: "⭐⭐⭐⭐⭐",
    })
    .toArray();

  response.send(result);
});
//get highquatity by meals
app.get("/highservings/data", async function (request, response) {
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find({ servings: { $gte: 8, $lte: 20 } })
    .toArray();

  response.send(result);
});

//get lowquatity by meals
app.get("/lowservings/data", async function (request, response) {
  const result = await client
    .db("kitchen")
    .collection("recipe")
    .find({ servings: { $gte: 1, $lte: 8 } })
    .toArray();

  response.send(result);
});

async function genrateHashedPassword(password) {
  const NO_OF_ROUNDS = 10;
  const salt = await bcrypt.genSalt(NO_OF_ROUNDS);
  const HashedPassword = await bcrypt.hash(password, salt);
  return HashedPassword;
}
app.post("/signup", async function (request, response) {
  const { firstname, lastname, email, password } = request.body;
  const UserFromDb = await client
    .db("kitchen")
    .collection("signup")
    .findOne({ email: email });
  if (UserFromDb) {
    response.status(400).send({ message: "user already exists" });
  } else if (password.length < 8) {
    response
      .status(400)
      .send({ message: "password must be atleast 8 charecters" });
  } else {
    const HashedPassword = await genrateHashedPassword(password);
    const result = await client.db("kitchen").collection("signup").insertOne({
      firstname: firstname,
      lastname: lastname,
      email: email,
      password: HashedPassword,
    });

    response.send(result);

    console.log(result);
  }
});
app.post("/login", async function (request, response) {
  const { email, password } = request.body;
  const UserFromDb = await client
    .db("kitchen")
    .collection("signup")
    .findOne({ email: email });

  if (!UserFromDb) {
    response.status(401).send({ message: "invalid credentials" });
  } else {
    const storedDBPassword = UserFromDb.password;
    const isPasswordCheck = await bcrypt.compare(password, storedDBPassword);

    if (isPasswordCheck) {
      const token = jwt.sign({ id: UserFromDb._id }, process.env.SECRET_KEY);
      response.send({ message: "login successful", token: token });
    } else {
      response.status(401).send({ message: "invalid credentials" });
    }
  }
});

app.post("/forgot", async function (request, response) {
  const { email } = request.body;
  try {
    const userfromdb = await client
      .db("kitchen")
      .collection("signup")
      .findOne({ email: email });

    if (!userfromdb) {
      response.json({ status: "user not exists pls signup" });
    }
    const secret = process.env.SECRET_KEY + userfromdb.password;
    const token = jwt.sign(
      { email: userfromdb.email, id: userfromdb._id },
      secret,
      { expiresIn: "5m" }
    );
    const link = `http://localhost:5173/reset?id=${userfromdb._id}&token=${token}`;

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "rubynathan999@gmail.com",
        pass: "biknetgulezybmjc",
      },
    });

    // setup email data with unicode symbols
    let mailOptions = {
      from: "rubynathan999@gmail.com", // sender address
      to: userfromdb.email, // list of receivers
      subject: "forgot password reset flow using nodejs and nodemailer", // Subject line
      // plain text body
      html: `<a href=${link}>{link}</a>`,
    };

    // send mail with defined transport object
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log("Message sent: %s", info.messageId);
      response.status(200).json();
    });

    // console.log(link);
  } catch (error) {}
});

app.post(
  "/reset/:id/:token",
  express.json(),
  async function (request, response) {
    const { id, token } = request.params;
    const { password } = request.body;
    const userfromdb = await client
      .db("kitchen")
      .collection("signup")
      .findOne({ _id: new ObjectId(id) });

    if (!userfromdb) {
      response.send({ message: "user not exists" });
    }
    const secret = process.env.SECRET + userfromdb.password;
    try {
      // const verify = jwt.verify(token, secret);

      const HashedPassword = await genrateHashedPassword(password);
      const result = await client
        .db("kitchen")
        .collection("signup")

        .updateOne(
          {
            password: userfromdb.password,
          },
          {
            $set: {
              password: HashedPassword,
            },
          }
        );
      response.send({ message: "password updated" });
      console.log(result);
    } catch (error) {
      console.log(error);
      response.send({ message: "not verified" });
    }
  }
);
app.listen(PORT, () => console.log(`The server started in: ${PORT} ✨✨`));
