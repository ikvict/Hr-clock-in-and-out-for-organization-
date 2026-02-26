import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("attendance.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pin TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    type TEXT CHECK(type IN ('IN', 'OUT')),
    latitude REAL,
    longitude REAL,
    photo_path TEXT,
    gps_status TEXT,
    FOREIGN KEY(employee_id) REFERENCES employees(id)
  );
`);

// Seed data if empty
const employeeCount = db.prepare("SELECT COUNT(*) as count FROM employees").get() as { count: number };
if (employeeCount.count === 0) {
  db.prepare("INSERT INTO employees (id, name, pin, is_admin) VALUES (?, ?, ?, ?)").run("EMP001", "John Doe", "1234", 0);
  db.prepare("INSERT INTO employees (id, name, pin, is_admin) VALUES (?, ?, ?, ?)").run("ADMIN01", "Admin User", "9999", 1);
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use('/uploads', express.static(uploadsDir));

  // API Routes
  app.post("/api/login", (req, res) => {
    const { employeeId, pin } = req.body;
    const employee = db.prepare("SELECT * FROM employees WHERE id = ? AND pin = ?").get(employeeId, pin) as any;
    
    if (employee) {
      res.json({ 
        success: true, 
        user: { id: employee.id, name: employee.name, isAdmin: !!employee.is_admin } 
      });
    } else {
      res.status(401).json({ success: false, message: "Invalid ID or PIN" });
    }
  });

  app.post("/api/clock", (req, res) => {
    const { employeeId, type, latitude, longitude, photo, gpsStatus } = req.body;
    
    let photoPath = null;
    if (photo) {
      const base64Data = photo.replace(/^data:image\/png;base64,/, "");
      const fileName = `${employeeId}_${Date.now()}.png`;
      photoPath = `/uploads/${fileName}`;
      fs.writeFileSync(path.join(uploadsDir, fileName), base64Data, 'base64');
    }

    db.prepare(`
      INSERT INTO attendance (employee_id, type, latitude, longitude, photo_path, gps_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employeeId, type, latitude, longitude, photoPath, gpsStatus);

    res.json({ success: true });
  });

  app.get("/api/admin/logs", (req, res) => {
    const logs = db.prepare(`
      SELECT a.*, e.name as employee_name 
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.timestamp DESC
    `).all();
    res.json(logs);
  });

  app.get("/api/export", (req, res) => {
    const logs = db.prepare(`
      SELECT a.timestamp, e.name, a.type, a.gps_status, a.latitude, a.longitude
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      ORDER BY a.timestamp DESC
    `).all() as any[];

    const csvRows = [
      ["Timestamp", "Employee Name", "Action", "GPS Status", "Latitude", "Longitude"].join(","),
      ...logs.map(log => [
        log.timestamp,
        log.name,
        log.type,
        log.gps_status,
        log.latitude,
        log.longitude
      ].join(","))
    ];

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=attendance_report.csv');
    res.send(csvRows.join("\n"));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
