const apiRequest = require('../services/api');


const fundbaseUrl = process.env.fundbaseUrl;
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

exports.fundlist = async (req, res) => {
    try {
        const user = req.session.user;
        let bankFund = [];

        if (user && user.bank_id) {
            
            const responseData = await apiRequest.get(`${fundbaseUrl}api/bank-funds/${user.bank_id}`,req);
            bankFund = responseData ? [responseData] : [];

        }else{
            const responseData = await apiRequest.get(`${fundbaseUrl}api/bank-funds/blocked`,req);
            bankFund = responseData || [];
        }
       

        res.render('pages/fund/fundlist', {
            title: 'fund list',
            bankFund,
            user,
            formatDate
        });
    } catch (error) {
        console.error("Error fetching bank funds:", error);
       res.render('pages/fund/fundlist', {
        title: 'fund list',
        bankFund: [],
        user: req.session.user,
        formatDate,
        errorMessage: "Une erreur est survenue lors de la récupération des fonds."
        });
    }

};

exports.addFund = async (req, res) => {
    const { msisdn, amount, description} = req.body;
    const user = req.session.user;
    const formatPhone = (number) => {
        const clean = number.replace(/^(\+?237)?0?/, '').trim();
        return `237${clean}`;
    };
    try {
        if (!user?.bank_id) {
            res.redirect('/funds/list?info=' + encodeURIComponent('bankId is required'));
        }

        const formattedMsisdn = formatPhone(msisdn);

        const payload = {
            bank_id: user.bank_id,
            msisdn: formattedMsisdn,
            amount,
            description
        };

        console.log('payload',payload);

        await apiRequest.post(`${fundbaseUrl}api/add-money`, payload,req);
       
        
        res.redirect('/funds/list?success=' + encodeURIComponent('Fund successfully added. Dial *126# to confirm payment'));
    } catch (error) {
        console.error("Error adding  fund:", error);
        res.redirect('/funds/list?error=' + encodeURIComponent(error.message || 'Failed to add fund'));
    }
}

exports.activatefund = async (req, res) => {
    const fund_addition_id = req.body.id;
    const amount = req.body.amount;
    
    try {

        const payload = {
            fund_addition_id,
            amount,
            
        };

        console.log('payload',payload);

        await apiRequest.post(`${fundbaseUrl}api/bank-funds/activate`, payload, req);
       
        
        res.redirect('/funds/list?success=' + encodeURIComponent('Fund successfully activated'));
    } catch (error) {
        console.error("Error adding  fund:", error);
        res.redirect('/funds/list?error=' + encodeURIComponent('Failed to activate fund'));
    }
}
