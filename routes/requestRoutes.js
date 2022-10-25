const express = require('express');
const router = express.Router();
const { sendFriendRequest, getFriendRequestList, updateRequest } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send-friend-request', protect, sendFriendRequest);
router.get('/get-friend-request-list', protect, getFriendRequestList);
router.patch('/update-request', protect, updateRequest);

module.exports = router;