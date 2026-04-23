import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { PiccarboonOrchestrator } from "./piccarboon/orchestrator.js";
const app = express();
const PORT = 5002;
app.use(cors());
app.use(express.json());
app.use("/uploads/images", express.static(path.join(__dirname, "uploads/images")));
app.use("/uploads/piccarboon", express.static(path.join(__dirname, "uploads/piccarboon")));
// تأكد من وجود مجلد Uploads
const uploadDir = path.join(__dirname, "uploads/images");
if (!fs.existsSync(uploadDir))
    fs.mkdirSync(uploadDir, { recursive: true });
const picDir = path.join(__dirname, "uploads/piccarboon");
if (!fs.existsSync(picDir)) fs.mkdirSync(picDir, { recursive: true });
const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const fileFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
        return cb(new Error("Invalid file type"));
    }
    cb(null, true);
};
const upload = multer({ storage, fileFilter });
const picStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, picDir),
    filename: (_req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const picFilter = (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (!allowed.test(path.extname(file.originalname).toLowerCase())) {
        return cb(new Error("Invalid file type"));
    }
    cb(null, true);
};
const picUpload = multer({ storage: picStorage, fileFilter: picFilter });
// Using plain JavaScript objects to store photo metadata
let photos = [];
app.get("/api/setta/photos", (_req, res) => {
    res.json(photos.map(p => ({
        id: p.id,
        imageUrl: `http://localhost:${PORT}/uploads/images/${p.filename}`,
        caption: p.caption,
        createdAt: p.createdAt,
    })));
});
app.post("/api/setta/upload", upload.single("photo"), (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
    const { caption } = req.body;
    const newPhoto = {
        id: photos.length + 1,
        userId: "guest_user",
        filename: req.file.filename,
        caption: caption || "",
        createdAt: new Date().toISOString(),
    };
    photos.push(newPhoto);
    res.status(201).json({
        id: newPhoto.id,
        imageUrl: `http://localhost:${PORT}/uploads/images/${newPhoto.filename}`,
        caption: newPhoto.caption,
        createdAt: newPhoto.createdAt,
    });
});
// Piccarboon — Daily Challenge
app.get("/api/piccarboon/challenge", (_req, res) => {
    const challenge = PiccarboonOrchestrator.getDailyChallenge();
    res.json(challenge);
});
// Piccarboon — Submit attempt
app.post("/api/piccarboon/submit", picUpload.single("image"), async (req, res) => {
    if (!req.file)
        return res.status(400).json({ message: "No image uploaded" });
    const imageUrl = `http://localhost:${PORT}/uploads/piccarboon/${req.file.filename}`;
    let features = {};
    try {
        const raw = (req && req.body && req.body.features) || "{}";
        features = JSON.parse(raw);
    }
    catch { }
    try {
        const result = await PiccarboonOrchestrator.submit({ imageUrl, features });
        return res.status(200).json(result);
    }
    catch (e) {
        console.error("Piccarboon submit error:", e);
        return res.status(500).json({ message: "Failed to process submission" });
    }
});
// Piccarboon — Leaderboard
app.get("/api/piccarboon/leaderboard", (_req, res) => {
    res.json(PiccarboonOrchestrator.leaderboard());
});
// Piccarboon — Winners & Losers
app.get("/api/piccarboon/winners", (_req, res) => {
    res.json(PiccarboonOrchestrator.winners());
});
app.get("/api/piccarboon/losers", (_req, res) => {
    res.json(PiccarboonOrchestrator.losers());
});
app.listen(PORT, () => console.log(`Setta X Tes3a API running on port ${PORT}`));
