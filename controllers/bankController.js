const apiRequest = require('../services/api');
const multer = require('multer');
const path = require('path');
const BankbaseUrl = process.env.BankbaseUrl;
const fundbaseUrl = process.env.fundbaseUrl;
const UserbaseUrl = process.env.UserbaseUrl;

const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb('Error: Images Only!');
  }
}).single('logo_url');

exports.getbanks = async (req, res) => {
    try {
        const responseData = await apiRequest.get(BankbaseUrl + 'api/banks/getAllBanks',req);

        if (!responseData || !Array.isArray(responseData)) {
            throw new Error('Invalid data received from API');
        }

        res.render('pages/bank/list', {
            title: 'Bank List',
            banks: responseData
        });
    } catch (error) {
        console.error("Error fetching banks:", error);
        res.render('pages/bank/list',{
            banks: [],
        });
    }

}

exports.bankInfo = async (req, res) => {

    try {
        const bank_id = req.params.id;
        const user = req.session.user;


        // get bank information
        const bankinfo = await apiRequest.get(`${BankbaseUrl}api/banks/getBankById/${bank_id}`, req);

        //get client for a bank
        const clientbank = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);  

        // get all funds
        let allFunds = await apiRequest.get(`${fundbaseUrl}api/bank-funds`, req);

        // ✅ filter funds by bank_id from params
        let bankfund = allFunds.filter(fund => fund.bank_id === bank_id);

        // Filtrer selon le bank_id de la bank
        if (user && user.bank_id) {
            clientbank = clientbank.filter(client => client.bank_id === user.bank_id);
            bankfund = bankfund.filter(bank => bank.bank_id === user.bank_id);
        }

        const banktransaction = await apiRequest.get(`${fundbaseUrl}api/fund-transactions/${bank_id}?bank_id=${bank_id}`, req);
        let transaction = Array.isArray(banktransaction) ? banktransaction : [banktransaction];
        //Sort transactions by createdAt (newest first)
        transaction.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

     

        res.render('pages/bank/bankInfo', {
            bankinfo,
            transaction,
            clientbank,
            bankfund
        });

    } catch (error) {
        console.error("Aucune information disponible:", error);
        return res.redirect('/bank/list?error=' + encodeURIComponent('Aucune information disponible'));
    }
};

exports.getBankForm = async (req, res) => {
    res.render('pages/bank/create', {
        title: 'Create Bank Form',

    });
};

exports.saveBank = async (req, res) => {

    const { name, short_name, code, interest_rate } = req.body;
    if (!name || !short_name || !code || !interest_rate) {
        return res.redirect('/banks/create?error=' + encodeURIComponent('All fields are required'));
    }

    try {
        const bankdata = {
            name,
            short_name,
            code
        }
        

        // 1. First create the bank
        const createdbank = await apiRequest.post(BankbaseUrl + 'api/banks/createBank', bankdata, req);
     

       const bank_id = createdbank?.bank?.id;

        if (!bank_id) {
            throw new Error("L'ID de la bank est manquant dans la réponse de création");
        }

        // 2. Then create bank config
        const createbankConfig = {
            bank_id,
            interest_rate
        }


        const bankConfig = await apiRequest.post(`${BankbaseUrl}api/bank-configs/createConfig`, createbankConfig, req);
 


        res.redirect('/banks/list?success=' + encodeURIComponent('Bank successfully created'));

    } catch (error) {
        console.error("Error creating bank:", error);
       res.redirect('/banks/list?error=' + encodeURIComponent('Failed to create a bank'));
    }
}

exports.editBank = async (req, res) => {
    const id = req.params.id;
    try {
        const bank = await apiRequest.get(`${BankbaseUrl}api/banks/${id}`,req);

        if (!bank || !bank.id) {
            throw new Error('Bank not found');
        }

        res.render('pages/bank/edit', {
            title: 'Edit Bank',
            bank // ✅ on passe la banque à la vue
        });

    } catch (error) {
        console.error("Error fetching bank:", error);
        res.redirect('/banks/list?error=' + encodeURIComponent("Impossible de charger la banque"));
    }
}

exports.saveUpdatedBank = async (req, res) => {
    const { name, code } = req.body;
    const id = req.params.id;

    try {
        const bankdata = { name, code };
        await apiRequest.put(`${BankbaseUrl}api/banks/updateBank/${id}`, bankdata,req);
        return res.redirect(`/banks/${id}/bankInfo?success=` + encodeURIComponent('Bank updated'));
    } catch (error) {
        console.error("Erreur lors de la mise à jour de la banque:", error);
        res.redirect(`/banks/${id}/bankInfo?error=` + encodeURIComponent('error in updating'));
    }
};

exports.deleteBank = async (req, res) => {

    try {
        const id = req.params.id;
        await apiRequest.delete(`${BankbaseUrl}api/banks/deleteBank/${id}`,req);
        return res.redirect('/banks/list?success=' + encodeURIComponent('Bank deleted'));
    } catch (error) {
        console.error("Error deleting bank:", error);
        res.redirect(`/banks/${id}/bankInfo?error=` + encodeURIComponent('error in bank deletion'));
    }
}

exports.saveConfig = async (req, res) => {
    const { interest_rate } = req.body;
    const user = req.session.user;

    try {
       
        if (!user?.bank_id) {
            return res.status(403).json({ error: 'banque non trouvée' });
        }
        const bank_id = user.bank_id;
        const payload = { bank_id, interest_rate };

        await apiRequest.post(`${BankbaseUrl}api/bank-configs/createConfig`, payload,req);

        return res.redirect(`pages/bank/config?success=` + encodeURIComponent('Config successfully creqted'));

    } catch (error) {
        console.error('Erreur dajout du config :', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
};

exports.getbanksConfig = async (req, res) => {
    try {
        const user = req.session.user;
        let bankConfig = [];

        if (user && user.bank_id) {
            // 🔁 Cas 1 : utilisateur lié à une banque
            const bankId = user.bank_id;
            const responseData = await apiRequest.get(`${BankbaseUrl}api/bank-configs/getAllConfig/${bankId}`,req);
         
            bankConfig = responseData;
        } else {
            // 🔁 Cas 2 : utilisateur général (ex: admin central)
           

            const responseData = await apiRequest.get(`${BankbaseUrl}api/bank-configs/getAllConfigs`,req);
            bankConfig = responseData;
        }
        // const responseData = await apiRequest.get(BankbaseUrl + 'api/bank-configs/getAllConfigs');


        res.render('pages/bank/config', {
            bankConfig
        });
    } catch (error) {
        console.error("Error fetching bank config:", error);
        return res.redirect('/banks/config?error=' + encodeURIComponent('failed to fetch config'));
    }
}

exports.updateConfig = async (req, res) => {
    const { configId,interest_rate } = req.body;
    const user = req.session.user;

    try {
        if (!configId) {
            return res.status(400).json({ error: 'config id manquant' });
        }
        if (!user?.bank_id) {
            return res.status(403).json({ error: 'banque non trouvée' });
        }
        const bank_id = user.bank_id;
        const payload = { bank_id, interest_rate };

        await apiRequest.put(`${BankbaseUrl}api/bank-configs/updateConfig/${configId}`, payload,req);

        return res.redirect('/banks/listConfig?success=' + encodeURIComponent('Config updated successfully'));

    } catch (error) {
        console.error('Erreur update du config :', error);
        return res.status(500).json({ error: error.message || 'Erreur serveur' });
    }
};

exports.UpdateBankInfo = async (req, res) => {
  upload(req, res, async (err) => {
    const { name, short_name, contact, address, latitude, longitude } = req.body;
    const id = req.session.user.bank_id;

    if (err) {
      console.error("Erreur lors du téléchargement de l'image:", err);
      return res.redirect(`/dashboard?error=` + encodeURIComponent('Error uploading image'));
    }

    let logo_url = req.file ? `/uploads/${req.file.filename}` : null;
    const bankdata = { name, short_name, logo_url, contact, address, latitude, longitude };

    try {
      await apiRequest.put(`${BankbaseUrl}api/banks/updateBank/${id}`, bankdata, req);
      return res.redirect(`/dashboard?success=` + encodeURIComponent('Bank updated'));
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la banque:", error);
      res.redirect(`/dashboard?error=` + encodeURIComponent('error in updating'));
    }
  });
};

// exports.UpdateBankInfo = async (req, res) => {
//     const {  name, short_name, logo_url, contact, address, latitude, longitude } = req.body;
//     const id = req.session.user.bank_id;
   
//     try {
//         const bankdata = { name, short_name, logo_url, contact, address, latitude, longitude };
//         console.log('bankdata', bankdata);
        
//         await apiRequest.put(`${BankbaseUrl}api/banks/updateBank/${id}`, bankdata,req);
//         return res.redirect(`/dashboard?success=` + encodeURIComponent('Bank updated'));
//     } catch (error) {
//         console.error("Erreur lors de la mise à jour de la banque:", error);
//         res.redirect(`/dashboard?error=` + encodeURIComponent('error in updating'));
//     }
// };