const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173", "http://localhost:5174",
      // "https://cars-doctor-6c129.web.app",
      // "https://cars-doctor-6c129.firebaseapp.com",
    ],
    credentials: true,
  })
);
// app.use(cors());
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@gocarservice.4k8igdd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// middlewares
const logger = (req, res, next) => {
  console.log("log: info", req.method, req.url);
  next();
};

const verifyToken = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const carCollection = client.db("carDB").collection("products");
    const purchaseCollection = client.db("carDB").collection("purchases");

    // Auth related api
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log(user);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("token", token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true });
    });

    // Service Api
    app.get("/products", async (req, res) => {
      const cursor = carCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

  app.get("/products/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await carCollection.findOne(query);
    res.send(result);
  });

  app.get("/products", logger, verifyToken, async (req, res) => {
    console.log(req.query.email);
    // console.log('ttttt token', req.cookies.token)
    console.log("user in the valid token", req.user);
    if (req.query.email !== req.user.email) {
      return res.status(403).send({ message: "forbidden access" });
    }

    let query = {};
    if (req.query?.email) {
      query = { email: req.query.email };
    }
    const result = await carCollection.find(query).toArray();
    res.send(result);
  });


  app.post("/products", async (req, res) => {
    const product = req.body;
    console.log(product);
    const result = await carCollection.insertOne(product);
    res.send(result);
  });

  app.put("/products/:id", async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const options = { upsart: true };
    const updateService = req.body;
    const products = {
      $set: {
        service_name: updateService.service_name,
        image: updateService.image,
        area: updateService.area,
        description: updateService.description,
        price: updateService.price,
      },
    };
    const result = await carCollection.updateOne(filter, products, options);
    res.send(result);
  });

  app.delete("/products/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await carCollection.deleteOne(query);
    res.send(result);
  });

  app.post("/purchases", async (req, res) => {
    const product = req.body;
    console.log(product);
    const result = await purchaseCollection.insertOne(product);
    res.send(result);
  });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Fitness Club Center server is running.....");
});

app.listen(port, () => {
  console.log(`Fitness Server is running on port: ${port}`);
});
