function dateOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
}

module.exports = [
  {
    title: "Finish the SmartTasker project",
    description: "Polish the task dashboard and make sure the main actions work smoothly.",
    category: "Work",
    priority: "high",
    status: "in-progress",
    dueDate: dateOffset(1),
  },
  {
    title: "Review this week's priorities",
    description: "Choose the three most important things to focus on this week.",
    category: "Personal",
    priority: "high",
    status: "todo",
    dueDate: dateOffset(0),
  },
  {
    title: "Plan the team check-in",
    description: "Prepare a short agenda and share it with the team.",
    category: "Work",
    priority: "medium",
    status: "todo",
    dueDate: dateOffset(2),
  },
  {
    title: "Organize project notes",
    description: "Move loose notes into clear folders and archive old drafts.",
    category: "Work",
    priority: "low",
    status: "done",
    dueDate: dateOffset(-1),
  },
  {
    title: "Get outside for a walk",
    description: "Take a screen break and get some fresh air after lunch.",
    category: "Wellbeing",
    priority: "low",
    status: "todo",
    dueDate: dateOffset(1),
  },
  {
    title: "Send the project update",
    description: "Share progress, next steps, and any open questions.",
    category: "Work",
    priority: "medium",
    status: "in-progress",
    dueDate: dateOffset(0),
  },
  {
    title: "Read a chapter",
    description: "Make a little time for the book on the nightstand.",
    category: "Personal",
    priority: "low",
    status: "todo",
    dueDate: dateOffset(4),
  },
  {
    title: "Clear the downloads folder",
    description: "Keep useful files and remove things that are no longer needed.",
    category: "Personal",
    priority: "medium",
    status: "done",
    dueDate: dateOffset(-2),
  },
];
