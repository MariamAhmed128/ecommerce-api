const {
    uploadToCloudinary,
    deleteFromCloudinary
} = require("./uploadToCloudinary");


// ================= Upload Product Images =================
const uploadProductImages = async (files) => {

    const uploadedPublicIds = [];

    try {

        const uploadedImages = await Promise.all(

            files.map(async (file) => {

                const uploaded = await uploadToCloudinary(
                    file.buffer,
                    "ecommerce/products"
                );

                uploadedPublicIds.push(uploaded.public_id);

                return {
                    url: uploaded.secure_url,
                    publicId: uploaded.public_id
                };

            })

        );

        return {
            uploadedImages,
            uploadedPublicIds
        };

    } catch (error) {

        await deleteProductImages(uploadedPublicIds);

        throw error;

    }

};


// ================= Delete Product Images =================
const deleteProductImages = async (publicIds = []) => {

    if (!publicIds.length) return;

    await Promise.allSettled(

        publicIds.map(publicId =>
            deleteFromCloudinary(publicId)
        )

    );

};


module.exports = {
    uploadProductImages,
    deleteProductImages
};