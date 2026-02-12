import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, uploadsDir);
	},
	filename: (req, file, cb) => {
		const ext = path.extname(file.originalname);
		const name = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}${ext}`;
		cb(null, name);
	},
});

// File filter for images
const imageFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
	const allowed = /jpeg|jpg|png|webp/;
	const ext = path.extname(file.originalname).toLowerCase();
	if (allowed.test(ext)) cb(null, true);
	else cb(new Error('Only image files are allowed'));
};

export const uploadSingle = (fieldName = 'file') => multer({ storage, fileFilter: imageFileFilter }).single(fieldName);
export const uploadArray = (fieldName = 'images', maxCount = 5) => multer({ storage, fileFilter: imageFileFilter }).array(fieldName, maxCount);

export default multer({ storage });
