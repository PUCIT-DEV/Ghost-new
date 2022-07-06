const _ = require('lodash');

const commentFields = [
    'id',
    'status',
    'html',
    'created_at',
    'edited_at'
];

const memberFields = [
    'id',
    'name',
    'bio',
    'avatar_image'
];

module.exports = (model, frame) => {
    const jsonModel = model.toJSON ? model.toJSON(frame.options) : model;

    const response = _.pick(jsonModel, commentFields);

    if (jsonModel.member) {
        response.member = _.pick(jsonModel.member, memberFields);
    } else {
        response.member = null;
    }

    if (jsonModel.likes) {
        response.likes_count = jsonModel.likes.length;
    } else {
        response.likes_count = 0;
    }

    response.liked = false;
    if (jsonModel.likes && frame.original.context.member && frame.original.context.member.id) {
        const id = frame.original.context.member.id;
        response.liked = !!jsonModel.likes.find(l => l.member_id === id);
    }

    return response;
};
