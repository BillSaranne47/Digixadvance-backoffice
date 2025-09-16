const apiRequest = require('../services/api');

const OverdraftbaseUrl = process.env.OverdraftbaseUrl;
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

exports.dailyreportlist = async (req, res) => {
    try {
        const user = req.session.user;
        let DailyReport = null;

        if (user && user.bank_id) {
            
            const dailyRes  = await apiRequest.get(`${OverdraftbaseUrl}api/overdrafts/reports/daily?date=${new Date().toISOString().split('T')[0]}`, req);
            DailyReport =  dailyRes ? [dailyRes] : [];

        }
        console.log("DailyReport:", DailyReport);
  

       

        res.render('pages/overdraft/dailyreport', {
            title: 'Overdraft Reports',
            DailyReport,
            formatDate
        });
    } catch (error) {
        console.error("Error fetching bank funds:", error);
       res.render('pages/overdraft/report', {
        title: 'Overdraft Reports',
        DailyReport: null,
        });
    }

};
exports.monthlyreportlist = async (req, res) => {
    try {
        const user = req.session.user;
        let MonthlyReport = null;

        if (user && user.bank_id) {

            const monthlyRes  = await apiRequest.get(`${OverdraftbaseUrl}api/overdrafts/reports/monthly`,req);
            MonthlyReport = monthlyRes ? [monthlyRes] : [];

        }
        console.log("MonthlyReport:", MonthlyReport);

       

        res.render('pages/overdraft/monthlyreport', {
            title: 'Overdraft Reports',
            MonthlyReport,
            formatDate
        });
    } catch (error) {
        console.error("Error fetching bank funds:", error);
       res.render('pages/overdraft/report', {
        title: 'Overdraft Reports',
        MonthlyReport: null
        });
    }

};