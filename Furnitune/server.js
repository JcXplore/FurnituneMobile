// server.js
import express from "express";
import fs from "fs";
import mammoth from "mammoth";
import cors from "cors";

const app = express();
app.use(cors());

app.get("/furnitune-info", async (req, res) => {
  const buffer = fs.readFileSync("./Furnitune.docx");
  const { value } = await mammoth.extractRawText({ buffer });
  res.send(value);
});

app.listen(4000, () => console.log("✅ Server running on http://localhost:4000"));
