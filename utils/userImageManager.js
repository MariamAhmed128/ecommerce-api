const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("./uploadToCloudinary");


// ================= Upload User Avatar =================
const uploadUserAvatar = async (file) => {

    const uploaded = await uploadToCloudinary(
        file.buffer,
        "ecommerce/users"
    );

    return {
        url: uploaded.secure_url,
        publicId: uploaded.public_id
    };

};

// ================= Delete Old User Avatar After Successful Update =================


const deleteUserAvatar = async (publicId) => {

    if (!publicId) return;

    await deleteFromCloudinary(publicId);

};



// ================= Delete New User Avatar If Update Failed (Rollback) =================

const safeDeleteUserAvatar = async (publicId) => {
    if (!publicId) return;

    try {
        await deleteFromCloudinary(publicId);
    } catch (error) {
        console.error(
            "Failed to delete avatar:",
            error
        );
    }

};




module.exports = {
    uploadUserAvatar,
    deleteUserAvatar,
    safeDeleteUserAvatar
};