import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import Message from '../models/Message';
import MessageTracker from '../models/MessageTracker';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload Excel file with messages
router.post('/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    const batchName = req.body.batchName || 'Batch 1';
    
    // Clear existing messages for this batch
    await Message.deleteMany({ batchName });

    // Insert new messages with new format (Category, Activity, Affirmation)
    const messages = data.map((row: any, index: number) => ({
      category: row.Category || row.category || row['Theme'] || 'General',
      activity: row['30-60 Second Activity'] || row.activity || row.Activity || row.content || JSON.stringify(row),
      affirmation: row['Positive Affirmation'] || row.affirmation || row.Affirmation || '',
      dayNumber: index + 1,
      batchName,
      isSent: false
    }));

    await Message.insertMany(messages);

    res.json({ 
      message: 'Messages uploaded successfully',
      count: messages.length,
      batchName 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error', error });
  }
});

// Get current message
router.get('/current', async (req, res) => {
  try {
    const tracker = await MessageTracker.findOne();
    if (!tracker) {
      return res.status(404).json({ message: 'No messages configured' });
    }

    const message = await Message.findOne({
      batchName: tracker.currentBatch,
      dayNumber: tracker.currentDay
    });

    res.json({ message, tracker });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
