const express = require("express");
const { request } = require("http");
const jwt = require("jsonwebtoken");
const mongo = require("mongoose");
const md5 = require("js-md5");

mongo.connect(
    "mongodb+srv://anish:mongopass@cluster0.df0dhdo.mongodb.net/users_app"
);

const User = mongo.model("users", {
    name: String,
    username: String,
    password: String,
});

async function verifyUser(username, password) {
    const existingUser = await User.findOne({ username: username });
    if (!existingUser) return false;
    return existingUser.password == md5(password);
}

const jwtPassword = "jwtpass";
const app = express();
const port = 3000;
app.use(express.json());

app.get("/", (request, response) => {
    response.send("hello from authentication server");
});

app.get("/users/", async (request, response) => {
    const token = request.headers.authorization;
    try {
        const decodedToken = jwt.verify(token, jwtPassword);
        const username = decodedToken.username;
        const users = await User.find();
        const responseUsers = users
            .filter((user) => {
                return user.username != username;
            })
            .map((user) => {
                return {
                    username: user.username,
                    name: user.name,
                };
            });
        return response.json(responseUsers);
    } catch (error) {
        return response.json({
            msg: "Invalid Token",
        });
    }
});

app.post("/signin/", async (request, response) => {
    const username = request.body.username;
    const password = request.body.password;

    if (!(await verifyUser(username, password))) {
        return response.status(403).json({
            msg: "user does not exist in memory or db",
        });
    }

    const token = jwt.sign({ username: username }, jwtPassword);
    return response.json({ token: token });
});

app.post("/signup/", async (request, response) => {
    const name = request.body.name;
    const username = request.body.username;
    const password = request.body.password;

    const existingUser = await User.findOne({ username: username });
    if (existingUser)
        return response.status(400).json({
            msg: "username already exists",
        });

    const user = new User({
        name: name,
        username: username,
        password: md5(password),
    });
    user.save().then(() => console.log("User saved with info: ", user));

    const token = jwt.sign({ username: username }, jwtPassword);
    return response.json({ token: token });
});

app.listen(port, () => {
    console.log("server started at port: ", port);
});
