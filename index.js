import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT;

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATBASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Railway
});

// Test the connection
try {
  const client = await pool.connect();
  const res = await client.query("SELECT NOW()");
  console.log("Connected to Railway DB at:", res.rows[0].now);
  client.release();
} catch (err) {
  console.error("Database connection error:", err);
}

export default pool;

const db = new pg.Client({
  user: "postgres",
  host: "shortline.proxy.rlwy.net",
  database: "railway",
  password: "wjzMUTwneOXoYReGYNLFIQfxghidKlbh",
  port: 11270,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisisted() {
  const result = await db.query("SELECT country_code FROM visited_countries WHERE user_id = $1", [currentUserId]);
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}
async function getCurrentUser() {
  const result = await db.query("SELECT * FROM users");
  users = result.rows;
  return users.find((user) => user.id === currentUserId);
};
function capitalizer(str){
  function capitalizeWord(word){
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }
  let input = str.split(" ");
  return input.map((word) => capitalizeWord(word)).join(" ");
};

app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const userId = await getCurrentUser();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: userId.color,
  });
});
app.post("/add", async (req, res) => {
  const input = req.body["country"].trim();
  const capitalUser = capitalizer(input);
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE (country_name) LIKE $1 || '%';",
      [capitalUser]
    );
    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});
app.post("/user", async (req, res) => {
  if (req.body.add === "new"){
   res.render("new.ejs");
  } else {
    currentUserId = parseInt(req.body.user);
    res.redirect("/");
  }
});

app.post("/new", async (req, res) => {
  const userName = req.body.name;
  const userColor = req.body.color;

  const result = db.query("INSERT INTO users (name, color) VALUES ($1, $2)", [userName, userColor]);
  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
