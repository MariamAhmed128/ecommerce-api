const buildUserFilter = (query) => {

    const filter = {
        isActive: true
    };

    if (query.role) {
        filter.role = query.role;
    }

    if (query.isVerified !== undefined) {
        filter.isVerified = query.isVerified === "true";
    }

    if (query.search) {

        const searchRegex = new RegExp(query.search, "i");

        filter.$or = [
            { username: searchRegex },
            { email: searchRegex }
        ];

    }

    return filter;

};


const getAllowedUserUpdates = (isAdmin) => {

    const allowedUpdates = [
        "username",
        "phone",
        "addresses"
    ];

    if (isAdmin) {

        allowedUpdates.push(
            "role",
            "isVerified"
        );

    }

    return allowedUpdates;

};



const validateAllowedFields = (
    updates,
    allowedFields
) => {

    return updates.every(field =>
        allowedFields.includes(field)
    );

};



module.exports = {
    buildUserFilter,
    getAllowedUserUpdates,
    validateAllowedFields
};