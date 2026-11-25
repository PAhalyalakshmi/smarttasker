const path = require("node:path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Task = require("./models/Task");
const demoTasks = require("./data/demoTasks");
const taskRoutes = require("./routes/tasks");

const app = express();
const port = Number(process.env.PORT) || 3000;
const publicDirectory = path.resolve(__dirname, "..", "public");

app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use("/api/tasks", taskRoutes);
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    storage: mongoose.connection.readyState === 1 ? "mongodb" : "demo-memory",
  });
});
app.use(express.static(publicDirectory));

async function start() {
  if (process.env.MONGO_URI) {
    await mongoose.connect(process.env.MONGO_URI);
    const taskCount = await Task.countDocuments();
    if (taskCount === 0) {
      await Task.insertMany(demoTasks);
      console.log(`MongoDB connected; added ${demoTasks.length} starter tasks.`);
    } else {
      console.log(`MongoDB connected; loaded ${taskCount} existing tasks.`);
    }
  } else {
    console.warn("MONGO_URI is not set. Using temporary demo data; changes reset when the server stops.");
  }

  app.listen(port, () => {
    console.log(`SmartTasker is ready at http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("SmartTasker could not start:", error.message);
  process.exitCode = 1;
});