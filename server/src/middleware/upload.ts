import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create subdirectories
const woFilesDir = path.join(uploadsDir, 'work-orders');
if (!fs.existsSync(woFilesDir)) {
    fs.mkdirSync(woFilesDir, { recursive: true });
}

// Configure storage for work order files
const woFileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, woFilesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// Configure memory storage for BOM imports (we parse them in memory)
const memoryStorage = multer.memoryStorage();

// File filter for work order files (accept most document types)
const woFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        'image/png',
        'image/jpeg',
        'image/jpg',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: PDF, Word, Excel, Text, Images'));
    }
};

// File filter for BOM imports (only CSV and Excel)
const bomFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only CSV and Excel files are allowed for BOM import.'));
    }
};

// Multer instances
export const uploadWoFile = multer({
    storage: woFileStorage,
    fileFilter: woFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    }
}).single('file');

export const uploadBomFile = multer({
    storage: memoryStorage,
    fileFilter: bomFileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit for BOM files
    }
}).single('file');
