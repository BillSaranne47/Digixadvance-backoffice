const fs = require('fs');
const apiRequest = require('../services/api');

exports.getDashboard = async (req, res) => {
    const fundbaseUrl = process.env.fundbaseUrl;
    const UserbaseUrl = process.env.UserbaseUrl;
    const OverdraftbaseUrl = process.env.OverdraftbaseUrl;
    const BankbaseUrl = process.env.BankbaseUrl;

    const user = req.session.user;

    let bankInfo = [];
    let totalClients = 0;
    let totalUsers = 0;
    let sumofbanks = 0;
    let bank = null;
    let overdraftCounts = {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
        PAID: 0
    };

    try {
        if (user && user.bank_id) {
            const bankId = user.bank_id;

            try {
                bank = await apiRequest.get(`${BankbaseUrl}api/banks/getBankById/${bankId}`, req);
                
            } catch (error) {
                
            }

            // 🟦 1. Clients
            try {
                
                const clientResponse = await apiRequest.get(`${UserbaseUrl}api/clients/bank`, req);
                totalClients = Array.isArray(clientResponse) ? clientResponse.length : 0;
            } catch (err) {
                if (err.status === 404) {
                    console.warn("Aucun client trouvé pour cette banque");
                } else {
                    console.error("Erreur lors de la récupération des clients:", err.message);
                }
            }

            // 🟦 2. Fonds
            try {
                const response = await apiRequest.get(`${fundbaseUrl}api/bank-funds/${bankId}`, req);
                bankInfo = response ? [response] : [];
                
            } catch (err) {
                if (err.status === 404) {
                    console.warn("Aucun fond trouvé pour cette banque");
                } else {
                    console.error("Erreur lors de la récupération des fonds:", err.message);
                }
            }

            // 🟦 3. Overdrafts
            try {
                const overdraftsResponse = await apiRequest.get(
                    `${OverdraftbaseUrl}api/getAll/overdrafts?bank_id=${bankId}`,
                    req
                );
                
                if (Array.isArray(overdraftsResponse)) {
                    overdraftsResponse.forEach(overdraft => {
                        if (overdraft.status && overdraftCounts.hasOwnProperty(overdraft.status)) {
                            overdraftCounts[overdraft.status]++;
                        }
                    });
                }
            } catch (err) {
                if (err.status === 404) {
                    console.warn("Aucun overdraft trouvé pour cette banque");
                } else {
                    console.error("Erreur lors de la récupération des overdrafts:", err.message);
                }
            }

            
            
            
        }else{
            // 🟦 1. banks
            const totalbanks = await apiRequest.get(`${BankbaseUrl}api/banks/getAllBanks`, req);
            sumofbanks = Array.isArray(totalbanks) ? totalbanks.length : 0;

            // 🟦 2. clients
            const clientResponse = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);
            totalClients = Array.isArray(clientResponse) ? clientResponse.length : 0;

             // 🟦 3. clients
            const userResponse = await apiRequest.get(`${UserbaseUrl}api/users/getAllUsers`, req);
            totalUsers = Array.isArray(userResponse) ? userResponse.length : 0;

            
        }

        res.render('pages/dashboard', {
            title: 'Dashboard',
            sumofbanks,
            bankInfo,
            totalClients,
            totalUsers,
            overdraftCounts,
            bank  
        });
    } catch (error) {
        console.error("Erreur générale dashboard:", error);
        res.render('pages/dashboard', {
            user: req.session.user,
            sumofbanks:[],
            bankInfo:[],
            totalClients:[],
            totalUsers:[],
            overdraftCounts:[],
            bank:[]
        });
    }
};
