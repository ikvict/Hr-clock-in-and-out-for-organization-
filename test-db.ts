import Database from "better-sqlite3";
try {
  const db = new Database("attendance.db");
  const employees = db.prepare("SELECT * FROM employees").all();
  console.log("Employees found:", employees);
} catch (error) {
  console.error("Database test failed:", error);
}
