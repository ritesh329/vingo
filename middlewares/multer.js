// import multer from "multer";
// import path from "path";

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // ✅ Files ./public/uploads में save होंगे
//     cb(null, path.join(process.cwd(), "public", "uploads"));
//   },
//   filename: (req, file, cb) => {
//     // ✅ Unique filename बन जाएगा (timestamp + originalname)
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// export const upload = multer({ storage });

import multer from "multer";

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});