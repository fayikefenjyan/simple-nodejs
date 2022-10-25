const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');

const User = require("../models/userModel");
const Request = require("../models/requestModel");

const statuses = ['pending', 'accepted', 'rejected'];

// Register user
const registerUser = asyncHandler(async (req, res, next) => {
    const { firstName, lastName, email, password, isActive } = req.body;

    if (!firstName || !lastName || !email || !password) {
        res.status(400);
        throw new Error('Please add all fields');
    }

    // Check if user exists
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400);
        throw new Error('User already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
        //Create a user
        return User.create({
            firstName,
            lastName,
            email,
            isActive,
            password: hashedPassword,
        }).then((user) => {
            return res.json({
                user,
                token: generateToken(user._id),
            });
        });
    } catch (e) {
        return res.json({
            status: 400,
            message: e.message
        });
    }
});

// Login user
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });
    if (user && !user.isActive) {
        res.status(403);
        throw new Error('User is not activated');
    }

    const compared = await bcrypt.compare(password, user.password);

    if (user && compared) {
        return res.json({
            user,
            token: generateToken(user._id),
        });
    } else {
        res.status(400);
        throw new Error('Invalid credentials');
    }
});

const getMe = asyncHandler(async (req, res) => {

    return res.json({
        user: req.user || {}
    });
});

const getUsers = asyncHandler(async (req, res) => {
    let status = req && req.query && req.query.isActive || false;

    return User.find({ isActive: status }).then((users) => {
        return res.send({
            users
        });
    });
});

const sendFriendRequest = asyncHandler(async (req, res) => {
    const { from, to } = req.body;

    if (!from || !to) {
        res.status(404);
        throw new Error('Not found');
    }

    let userFrom = await User.findOne({ _id: from });
    let userTo = await User.findOne({ _id: to });

    if (!userFrom || !userTo) {
        res.status(404);
        throw new Error('Not found');
    }

    let userToFriendList = userTo.friendList;
    if (
        userToFriendList && userToFriendList.length &&
        userToFriendList.includes(from)
    ) {
        res.status(400);
        throw new Error('Already in friend list');
    }

    let requestExists = await Request.findOne({ from: from, to: to });

    if (requestExists) {
        let message = '';

        if (requestExists.status === 'pending') {
            message = 'Please wait user response';
        }
        if (requestExists.status === 'accepted') {
            message = 'Request already accepted';
        }
        if (requestExists.status === 'rejected') {
            message = 'Request already rejected';
        }

        res.status(400);
        throw new Error(message);
    }

    try {
        //Create a user
        return Request.create({
            from,
            to
        }).then((request) => {
            return res.json({
                request
            });
        });
    } catch (e) {
        return res.json({
            status: 400,
            message: e.message
        });
    }
});


const getFriendRequestList = asyncHandler(async (req, res) => {

    let authUser = req.user;
    let requestStatus = req && req.query && req.query.status || 'pending';

    if (!statuses.includes(requestStatus)) {
        res.status(400);
        throw new Error('Wrong status');
    }

    let friendRequests = await Request.find({ to: authUser._id, status: requestStatus });

    return res.json({
        requests: friendRequests
    });
});

const updateRequest = asyncHandler(async (req, res) => {

    let id = req && req.body && req.body._id;
    let status = req && req.body && req.body.status;

    if (!statuses.includes(status)) {
        res.status(400);
        throw new Error('Wrong status');
    }

    let friendRequest = await Request.findOne({ _id: id });
    if (friendRequest) {
        try {

            return Request.updateOne({ _id: id },
                { $set: { status } }).then(async (request) => {
                    if (status === 'accepted') {
                        let authUserFriendList = await User.findOne({ _id: req.user._id }).select('friendList');
                        let friendList = authUserFriendList.friendList;
                        friendList.push(friendRequest.from);

                        await User.updateOne({ _id: req.user._id }, { $set: { friendList: friendList } });
                    }

                    return res.json({
                        request
                    });
                });
        } catch (e) {
            return res.json({
                status: 400,
                message: e.message
            });
        }
    }
});

const getFriendList = asyncHandler(async (req, res) => {
    return User.findOne({ _id: req.user._id }).select('friendList').populate('friendList')
        .then((friendList) => {
            return res.json({
                friendList
            });
        });
});


// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

module.exports = { registerUser, loginUser, getMe, getUsers, sendFriendRequest, getFriendRequestList, updateRequest, getFriendList };
