# SmartTasker

A responsive task dashboard with task creation, editing, completion, deletion, search, priority filters, and due-date sorting.

## Run the app

```powershell
cd E:\MERN\smarttasker\server
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000). Eight starter tasks are available automatically. Without `MONGO_URI`, SmartTasker uses temporary in-memory demo storage; changes reset when the server stops.

To keep tasks in MongoDB, start MongoDB and set the connection string before starting the server:

```powershell
$env:MONGO_URI = "mongodb://127.0.0.1:27017/smarttasker"
npm start
```

The app seeds MongoDB with starter tasks only when the collection is empty.

The JSON API is available at `/api/tasks`; `/api/health` reports the active storage mode.
