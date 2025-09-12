const db = require('../config/database');

const UserModel = {
    create: async (userData) => {
        const query = `
            INSERT INTO Users (
                first_name,
                last_name,
                phone,
                email,
                password,
                address,
                date_of_birth,
                place_of_birth,
                status,
                quarter,
                role_id,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        try {
            const result = await db.execute(query, [
                userData.first_name,
                userData.last_name,
                userData.phone,
                userData.email,
                userData.password,
                userData.address,
                userData.date_of_birth,
                userData.place_of_birth,
                userData.status || 'inactive',     // Default status is 'inactive'
                userData.quarter,
                userData.role_id || 1,             // Default role_id is 1
                userData.created_at || new Date(),
                userData.updated_at || new Date()
            ]);
            return result;
        } catch (error) {
            console.error("Error creating user:", error.message);
            throw new Error("Failed to create user. Please try again later.");
        }
    },

    findUserById: async (id) => {
        if (!id) {
            throw new Error("User ID is required.");
        }

        const query = `SELECT * FROM Users WHERE id = ?`;
        try {
            const [rows] = await db.execute(query, [id]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding user by ID:", error.message);
            throw new Error("Failed to retrieve user. Please try again later.");
        }
    },

    findByEmail: async (email) => {
        const query = `SELECT * FROM Users WHERE email = ?`;
        try {
            const [rows] = await db.execute(query, [email]);
            return rows.length > 0 ? rows[0] : null;
        } catch (error) {
            console.error("Error finding user by email:", error.message);
            throw new Error("Failed to retrieve user. Please try again later.");
        }
    },

    updatePassword: async (email, hashedPassword) => {
        const query = `UPDATE Users SET password = ? WHERE email = ?`;
        try {
            const result = await db.execute(query, [hashedPassword, email]);
            if (result[0].affectedRows === 0) {
                throw new Error("No user found with the specified email.");
            }
            return result;
        } catch (error) {
            console.error("Error updating password:", error.message);
            throw new Error("Failed to update password. Please try again later.");
        }
    },
};

module.exports = UserModel;
