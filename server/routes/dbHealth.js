import mongoose from 'mongoose';

// Health check route
export const dbHealth = async (req, res) => {
  try {
    const result = await mongoose.connection.db.admin().ping();
    res.json({ ok: 1 });
  } catch (error) {
    console.error('DB Health check failed:', error);
    res.status(500).json({ ok: 0, error: error.message });
  }
};

// Self-test route
export const dbSelfTest = async (req, res) => {
  try {
    const testCollection = mongoose.connection.db.collection('__ai_db_check__');
    
    // Test write
    const testDoc = { _id: new mongoose.Types.ObjectId(), test: true, timestamp: new Date() };
    await testCollection.insertOne(testDoc);
    
    // Test read
    const found = await testCollection.findOne({ _id: testDoc._id });
    
    // Cleanup - delete test document
    await testCollection.deleteOne({ _id: testDoc._id });
    
    res.json({
      write: true,
      read: !!found
    });
  } catch (error) {
    console.error('DB Self-test failed:', error);
    res.status(500).json({
      write: false,
      read: false,
      error: error.message
    });
  }
};
