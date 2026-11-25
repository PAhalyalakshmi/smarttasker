const { randomUUID } = require("node:crypto");
const express = require("express");
const mongoose = require("mongoose");
const Task = require("../models/Task");
const demoTasks = require("../data/demoTasks");

const router = express.Router();
const memoryTasks = demoTasks.map((task) => {
  const now = new Date();
  return {
    ...task,
    _id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
});

const allowedPriorities = ["low", "medium", "high"];
const allowedStatuses = ["todo", "in-progress", "done"];

function validateTaskInput(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Task details must be sent as a JSON object." };
  }

  const task = {};
  const fields = ["title", "description", "category", "priority", "status", "dueDate"];

  if (!partial && (typeof body.title !== "string" || !body.title.trim())) {
    return { error: "A task title is required." };
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return { error: "A task title is required." };
    }
    if (body.title.trim().length > 120) {
      return { error: "Task titles must be 120 characters or fewer." };
    }
    task.title = body.title.trim();
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 800) {
      return { error: "Descriptions must be 800 characters or fewer." };
    }
    task.description = body.description.trim();
  }

  if (body.category !== undefined) {
    if (typeof body.category !== "string" || body.category.trim().length > 40) {
      return { error: "Categories must be 40 characters or fewer." };
    }
    task.category = body.category.trim() || "General";
  }

  if (body.priority !== undefined) {
    if (!allowedPriorities.includes(body.priority)) {
      return { error: "Priority must be low, medium, or high." };
    }
    task.priority = body.priority;
  }

  if (body.status !== undefined) {
    if (!allowedStatuses.includes(body.status)) {
      return { error: "Status must be todo, in-progress, or done." };
    }
    task.status = body.status;
  }

  if (body.dueDate !== undefined) {
    if (!body.dueDate) {
      task.dueDate = null;
    } else {
      const dueDate = new Date(body.dueDate);
      if (Number.isNaN(dueDate.getTime())) {
        return { error: "Enter a valid due date." };
      }
      task.dueDate = dueDate;
    }
  }

  if (!partial) {
    for (const field of fields) {
      if (task[field] === undefined && field !== "dueDate") {
        task[field] = field === "title" ? "" : field === "description" ? "" : field === "category" ? "General" : field === "priority" ? "medium" : "todo";
      }
    }
  }

  return { task };
}

function isUsingMongo() {
  return mongoose.connection.readyState === 1;
}

router.get("/", async (req, res) => {
  try {
    const tasks = isUsingMongo()
      ? await Task.find().sort({ createdAt: -1 })
      : [...memoryTasks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(tasks);
  } catch (error) {
    console.error("Could not load tasks:", error.message);
    res.status(500).json({ message: "Could not load tasks." });
  }
});

router.post("/", async (req, res) => {
  const { task, error } = validateTaskInput(req.body);
  if (error) return res.status(400).json({ message: error });

  try {
    const created = isUsingMongo()
      ? await Task.create(task)
      : {
          ...task,
          _id: randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

    if (!isUsingMongo()) memoryTasks.unshift(created);
    res.status(201).json(created);
  } catch (requestError) {
    console.error("Could not create task:", requestError.message);
    res.status(500).json({ message: "Could not create task." });
  }
});

router.patch("/:id", async (req, res) => {
  const { task, error } = validateTaskInput(req.body, true);
  if (error) return res.status(400).json({ message: error });
  if (Object.keys(task).length === 0) {
    return res.status(400).json({ message: "Provide at least one task field to update." });
  }

  try {
    let updated;
    if (isUsingMongo()) {
      updated = await Task.findByIdAndUpdate(req.params.id, task, {
        new: true,
        runValidators: true,
      });
    } else {
      const index = memoryTasks.findIndex((item) => item._id === req.params.id);
      if (index !== -1) {
        memoryTasks[index] = {
          ...memoryTasks[index],
          ...task,
          updatedAt: new Date(),
        };
        updated = memoryTasks[index];
      }
    }

    if (!updated) return res.status(404).json({ message: "Task not found." });
    res.json(updated);
  } catch (requestError) {
    if (requestError instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: "Invalid task ID." });
    }
    console.error("Could not update task:", requestError.message);
    res.status(500).json({ message: "Could not update task." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    let deleted;
    if (isUsingMongo()) {
      deleted = await Task.findByIdAndDelete(req.params.id);
    } else {
      const index = memoryTasks.findIndex((item) => item._id === req.params.id);
      if (index !== -1) deleted = memoryTasks.splice(index, 1)[0];
    }

    if (!deleted) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted." });
  } catch (error) {
    if (error instanceof mongoose.Error.CastError) {
      return res.status(400).json({ message: "Invalid task ID." });
    }
    console.error("Could not delete task:", error.message);
    res.status(500).json({ message: "Could not delete task." });
  }
});

module.exports = router;