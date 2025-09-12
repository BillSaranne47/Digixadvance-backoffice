const apiRequest = require('../services/api');
const bcrypt = require('bcrypt');
require('dotenv').config();

const UserbaseUrl = process.env.UserbaseUrl;
const BackOfficebaseUrl = process.env.Back_Office_baseUrl;
const BankbaseUrl = process.env.BankbaseUrl;

exports.getProfile = async (req, res) => {
    res.render('pages/user/profile', {});
};

exports.getList = async (req, res) => {
    try {
        const user = req.session.user;
        let users = [];

        const getroles = await apiRequest.get(UserbaseUrl + 'api/roles/getAllRoles', req);
        const getbanks = await apiRequest.get(BankbaseUrl + 'api/banks/getAllBanks', req);

        if (user && user.bank_id) {
            const allusers = await apiRequest.get(`${UserbaseUrl}api/users/getAllUsersByBank`, req);
            users = allusers;
        } else {
            const allusers = await apiRequest.get(`${UserbaseUrl}api/users/getAllUsers`, req);
            users = allusers;
        }
        
        // 🧹 Filter out the currently logged-in user
        users = users.filter(u => u.id !== user.id);

        // 2. Collect unique bank_ids
        const uniqueBankIds = [...new Set(users.map(u => u.bank_id).filter(Boolean))];

        // 3. Fetch all bank names in parallel
        const bankRequests = uniqueBankIds.map(id => 
            apiRequest.get(`${BankbaseUrl}api/banks/getBankById/${id}`, req).then(bank => ({ id, name: bank.name }))
        );
        const bankResults = await Promise.all(bankRequests);

        // 4. Create a bankId -> bankName map
        const bankMap = {};
        bankResults.forEach(bank => {
            bankMap[bank.id] = bank.name;
        });

        // 5. Replace bank_id with bank_name in each user
        users = users.map(u => ({
            ...u,
            bank_name: u.bank_id ? bankMap[u.bank_id] || 'N/A' : 'No Bank'
        }));

        console.log('banks :',getbanks);
        console.log('roles :',getroles);
        console.log('users :',users);
        res.render('pages/user/list', {
            banks: getbanks,
            roles: getroles,
            users
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.render('pages/user/list',{
            banks: [],
            roles: [],
            users: []
        });
    }

};

exports.getUserForm = async (req, res) => {

    try {

        
        res.render('pages/user/create', {
            title: 'Create Client Form',
           
        });

    } catch {
        console.error("Error fetching data:", error);
        return res.status(500).send('<h1>Error fetching data</h1>');

    }

};

exports.saveUser = async (req, res) => {
    const { username, email, bank_id, role, password, msisdn } = req.body;
    const currentUser = req.session.user;

    const formatPhone = (number) => {
        const clean = number.replace(/^(\+?237)?0?/, '').trim();
        return `237${clean}`;
    };
    try {
        // const hashedPassword = await bcrypt.hash(password, 10);
        const formattedMsisdn = formatPhone(msisdn);
        const userdata = {
            username,
            email,
            password,
            role,
            bank_id,
            msisdn: formattedMsisdn,
        };

        console.log('saved user', userdata);

        await apiRequest.post(UserbaseUrl + 'api/users/CreateUser', userdata, req);

        res.redirect('/users/list?success=' + encodeURIComponent('User created successfully'));
    } catch (error) {
        console.error("Error saving user:", error);
        res.redirect('/users/create?error=' + encodeURIComponent(error.message || 'Failed to create user'));
    }
};

exports.updateProfile = async (req, res) => {
    const { username, email } = req.body;
    const userid = req.session.user.id;
    
    try {
        if (!username) {
            return res.redirect('/users/profile?info=' + encodeURIComponent("username required"));
        }

        await apiRequest.put(`${UserbaseUrl}api/users/UpdateUser/${userid}`, { username, email }, req);
        res.redirect('/logout?success=' + encodeURIComponent('User updated successfully'));
    } catch (error) {
        console.error("Error updating users:", error);
        return res.redirect('/users/profile?error=' + encodeURIComponent('Error in updating user'));
    }
}

exports.updateUser = async (req, res) => {
    const { username, email } = req.body;
    const userId = req.params.id;
    
    try {
        if (!username) {
            return res.redirect('/users/profile?info=' + encodeURIComponent("username required"));
        }

        await apiRequest.put(`${UserbaseUrl}api/users/UpdateUser/${userId}`, { username, email }, req);
        res.redirect('/users/list?success=' + encodeURIComponent('User updated successfully'));
    } catch (error) {
        console.error("Error updating users:", error);
        return res.redirect('/users/list?error=' + encodeURIComponent('Error in updating user'));
    }
}

exports.deleteUser = async (req, res) => {

    try {
        const id = req.params.id;
        await apiRequest.delete(`${UserbaseUrl}api/users/getDeleteById/${id}`, req);
        res.redirect('/users/list?success=' + encodeURIComponent('User successfully deleted'));
    } catch (error) {
        console.error("Error deleting user:", error);
        return res.redirect('/users/list?error=' + encodeURIComponent('error in deleting the User '));
    }
}

