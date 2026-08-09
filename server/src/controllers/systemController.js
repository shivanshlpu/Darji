import { clearEntryData } from '../scripts/clearEntryData.js';

export const handleClearEntryData = async (req, res) => {
  try {
    const summary = await clearEntryData();
    res.status(200).json({
      success: true,
      message: 'All app entry data cleared successfully!',
      summary,
    });
  } catch (error) {
    console.error('Error clearing app entry data:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to clear app entry data',
    });
  }
};
