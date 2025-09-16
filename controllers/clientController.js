const apiRequest = require('../services/api');
const FormData = require('form-data');
const { Readable } = require('stream');
const apiAxios = require('../services/api-axios');

const OverdraftbaseUrl = process.env.OverdraftbaseUrl;
const UserbaseUrl = process.env.UserbaseUrl;
const BankbaseUrl = process.env.BankbaseUrl;

exports.getClients = async (req, res) => {
    try {
        const user = req.session.user;
        let clients = [];
        let subscriptions = [];

        if (user && user.bank_id) {
            const bankId = user.bank_id;

            let response = [];
            try {
                response = await apiRequest.get(`${UserbaseUrl}api/clients/bank`, req);
            } catch (err) {
                if (err.status === 404) {
                    console.log("Aucun client trouvé pour cette banque.");
                    response = [];
                } else {
                    throw err;
                }
            }

            let subscribe = [];
            try {
                subscribe = await apiRequest.get(`${UserbaseUrl}api/subscription/client-subscriptions/bank_id`, req);
            } catch (err) {
                if (err.status === 404) {
                    console.log("Aucun subscribtion trouvé pour cette banque.");
                    subscribe = [];
                } else {
                    throw err;
                }
            }

            clients = response;
            subscriptions = subscribe;
        } else {
            const response = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);
            clients = response;
        }


        // Associer chaque client à son abonnement le plus récent
        const clientsWithSub = clients.map(client => {
            const clientSubs = subscriptions
                .filter(s => s.client_id === client.id)
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); 

            const latestSub = clientSubs[0] || null;

            return {
                ...client,
                subscription: latestSub
            };
        });

      
        res.render('pages/client/list', {
            title: 'Client List',
            clients: clientsWithSub
        });

    } catch (error) {
        console.error("Error fetching client:", error);
        res.render('pages/client/list', {
            title: 'fund list',
            clients: [],
            user: req.session.user,
        });
    }
};
// exports.getClients = async (req, res) => {
//     try {
//         const user = req.session.user;
//         let clients = [];
//         let subscriptions = [];

//         // If user has a bank_id OR is an admin (bank_id === null)
//         if (user && (user.bank_id || user.bank_id === null)) {
//             let response = [];
//             let subscribe = [];

//             try {
//                 if (user.bank_id) {
//                     // Regular user with a bank
//                     response = await apiRequest.get(`${UserbaseUrl}api/clients/bank`, req);
//                     subscribe = await apiRequest.get(`${UserbaseUrl}api/subscription/client-subscriptions/bank_id`, req);
//                 } else {
//                     // Admin with bank_id === null
//                     response = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);
//                     subscribe = await apiRequest.get(`${UserbaseUrl}api/subscription/client-subscriptions`, req); 
//                     // adjust this endpoint if needed
//                 }
//             } catch (err) {
//                 if (err.status === 404) {
//                     console.log("No clients or subscriptions found.");
//                     response = [];
//                     subscribe = [];
//                 } else {
//                     throw err;
//                 }
//             }

//             clients = response;
//             subscriptions = subscribe;
//         } else {
//             // fallback: just fetch all clients
//             clients = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);
//         }

//         // Attach the latest subscription to each client
//         const clientsWithSub = clients.map(client => {
//             const clientSubs = subscriptions
//                 .filter(s => s.client_id === client.id)
//                 .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

//             return {
//                 ...client,
//                 subscription: clientSubs[0] || null
//             };
//         });

//         res.render('pages/client/list', {
//             title: 'Client List',
//             clients: clientsWithSub
//         });

//     } catch (error) {
//         console.error("Error fetching client:", error);
//         res.render('pages/client/list', {
//             title: 'Client List',
//             clients: [],
//             user: req.session.user,
//         });
//     }
// };


exports.listInfo = async (req, res) => {

    try {
        const client_id = req.params.id;
        const user = req.session.user;

        // get client information
        const clientinfo = await apiRequest.get(`${UserbaseUrl}api/clients/${client_id}`, req);

        // get client recent transactions
        const response = await apiRequest.get(`${OverdraftbaseUrl}api/overdrafts/client/${client_id}`, req);
        let clients = Array.isArray(response) ? response : [response];

        // get client souscription
        const clientbank = await apiRequest.get(`${BankbaseUrl}api/client/getClientBanks/${client_id}`, req);
        link = Array.isArray(clientbank) ? clientbank : [clientbank];

        // Filtrer selon le bank_id de l'utilisateur connecté
        if (user && user.bank_id) {
            clients = clients.filter(client => client.bank_id === user.bank_id);
            link = link.filter(client => client.bank_id === user.bank_id);
        }
      
       
        res.render('pages/client/listInfo', {
            clientinfo,
            clients,
            link
        });

    } catch (error) {
        console.error("Aucune information disponible:", error);
        res.render('pages/client/listInfo', {
            clientinfo:[],
            clients:[],
            link:[]
        });
    }
};

exports.updatescoring = async (req, res) => {
    const { scoring, client_id } = req.body;

    try {

        const payload = { client_id, scoring: parseInt(scoring, 10) };

        await apiRequest.post(`${BankbaseUrl}api/clients-banks/update-scoring`, payload, req);

        res.redirect(`/clients/${client_id}/listInfo?success=` + encodeURIComponent('Scoring updated'));
    } catch (error) {
        console.error('Erreur mise à jour scoring :', error);
        res.redirect(`/clients/${client_id}/listInfo?error=` + encodeURIComponent('error updating the scoring'));
    }
};

exports.saveClient = async (req, res) => {
    const { name, msisdn, language, scoring } = req.body;
    const user = req.session.user;

    if (!name || !msisdn || !language) {
        return res.redirect('/clients/create?error=' + encodeURIComponent('All fields are required'));
    }

    if (!/^\d{9}$/.test(msisdn)) {
        return res.redirect('/clients/create?error=' + encodeURIComponent('the phone number must contain 9 digits'));
    }


    const formatPhone = (number) => {
        const clean = number.replace(/^(\+?237)?0?/, '').trim();
        return `237${clean}`;
    };

    const formattedPhone = formatPhone(msisdn);

    try {
        // 1. Récupérer tous les clients
        const allClients = await apiRequest.get(`${UserbaseUrl}api/clients/getAllClients`, req);


        // 2. Vérifier si un client avec le même numéro existe
        const existingClient = allClients.find(client => client.msisdn === formattedPhone);

        let client_id;

        if (existingClient) {
            console.log('Client déjà existant:', existingClient);
            client_id = existingClient.id;
        } else {
            // 3. Créer le client
            const clientData = {
                name,
                msisdn: formattedPhone,
                language
            };

            const createdClient = await apiRequest.post(`${UserbaseUrl}api/clients/createClient`, clientData, req);


            client_id = createdClient?.id;

            if (!client_id) {
                throw new Error("L'ID du client est manquant dans la réponse de création");
            }
        }

        // 4. Lier le client à la banque
        if (!user?.bank_id) {
            return res.status(403).json({ error: 'Banque non trouvée' });
        }

        const clientToBank = {
            client_id,
            bank_id: user.bank_id,
            scoring: scoring || 0
        };

        console.log('Lien client-banque:', clientToBank);

        const clientBank = await apiRequest.post(`${BankbaseUrl}api/clients-banks/linkClientToBank`, clientToBank, req);
        console.log('Réponse lien client-banque:', clientBank);

        res.redirect('/clients/list?success=' + encodeURIComponent('Client successfully Added'));
    } catch (error) {
        console.error("Erreur lors de l'ajout du client:", error);
        res.redirect('/clients/list?error=' + encodeURIComponent('Error in adding a client'));
    }
};

exports.importClients = async (req, res) => {
    try {
        const file = req.file;
        const user = req.session.user;

        console.log('📝 Fichier reçu:', file?.originalname);
        console.log('👤 Utilisateur:', user?.username || 'non connecté');

        if (!file) {
            console.warn('⚠️ Aucun fichier reçu');
            return res.status(400).send('Fichier CSV manquant');
        }

        if (!user?.accessToken) {
            console.warn('⛔️ Token utilisateur manquant');
            return res.status(401).send('Accès non autorisé : token manquant');
        }

        // Convertir le buffer en stream lisible
        const bufferStream = new Readable();
        bufferStream._read = () => { };
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        // Construire le formulaire multipart
        const form = new FormData();
        form.append('file', bufferStream, {
            filename: file.originalname,
            contentType: 'text/csv', // ou file.mimetype
        });

        // Préparer les en-têtes
        const headers = {
            ...form.getHeaders(),
            'Authorization': `Bearer ${user.accessToken}`,
            'Accept': 'application/json'
        };

        console.log('📤 Envoi fichier vers :', `${UserbaseUrl}api/clients/parse-headers`);
        console.log('📥 Headers envoyés:', headers);

        const response = await apiAxios.request(
            `${UserbaseUrl}api/clients/parse-headers`,
            'POST',
            form,
            req,
            { headers },
        );

        console.log('✅ Réponse backend:', response.data);

        // Renvoyer les headers au frontend
        res.json({
            success: true,
            file_transaction_id: response.data.id,
            headers: response.data.headers
        });
    } catch (error) {
        const message = error?.response?.data?.message || error.message;
        console.error('❌ Erreur import:', error?.response?.data || error);
        res.redirect('/clients/list?error=' + encodeURIComponent('Import échoué : ' + message));
    }
};

exports.importClientsFinal = async (req, res) => {
    console.log('🟢 Controller importClientsFinal appelé');
    try {
        const { file_transaction_id, mapping } = req.body;
        const user = req.session.user;
        console.log('✅ file_transaction_id:', file_transaction_id);
        console.log('✅ mapping reçu:', mapping);

        if (!user?.accessToken) {
            return res.status(401).send('⛔ Token manquant');
        }

        if (!file_transaction_id || !mapping) {
            return res.status(400).send('❌ Données incomplètes');
        }

        // Inverser le mapping
        // const invertedMapping = Object.fromEntries(
        //     Object.entries(mapping).map(([k, v]) => [v, k])
        // );


        const response = await apiAxios.request(
            `${UserbaseUrl}api/clients/importClients`,
            'POST',
            {
                file_transaction_id,
                mapping
            },
            req,
            {
                headers: {
                    'Authorization': `Bearer ${user.accessToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✅ Résultat import final:', response.data);
        res.status(200).json({ success: true });
    } catch (error) {
        const message = error?.response?.data?.message || error.message;
        console.error('❌ Erreur import final:', error?.response?.data || error);
        res.status(500).send('Erreur serveur : ' + message);
    }
};

exports.deleteClient = async (req, res) => {
    const client_id = req.params.id;
    try {
        if (!client_id) {
            return res.status(400).json({ error: 'ID du client manquant' });
        }

        apiRequest.delete(`${UserbaseUrl}api/clients/${client_id}`, req);

        return res.redirect('/clients/list?success=' + encodeURIComponent('Client successfully deleted'));

    } catch (error) {
        console.error("error in deleting client:", error);
        return res.redirect('/clients/list?error=' + encodeURIComponent('Error in deleting the client'));
    }
}

exports.resetDebt = async (req, res) => {
    const client_id = req.params.id;
    const amount_paid = req.body.amount_paid; 
 
    try {
        if (!client_id) {
            return res.status(400).json({ error: 'ID du client manquant' });
        }

        await apiRequest.post(`${OverdraftbaseUrl}api/overdrafts/reset-debt`, { client_id, amount_paid }, req);

        return res.redirect(`/clients/${client_id}/listInfo?success=` + encodeURIComponent('Client debt repaid'));

    } catch (error) {
        console.error("error in resetting:", error);
        return res.redirect('/clients/list?error=' + encodeURIComponent('Error in resetting'));
    }

}

exports.deleteClientBankLink = async (req, res) => {
    const linkId = req.params.id;
    console.log('linkId:', linkId);
    try {
        if (!linkId) {
            return res.status(400).json({ error: 'ID du lien manquant' });
        }

        await apiRequest.delete(`${BankbaseUrl}api/clients-banks/deleteLink/${linkId}`, req);

        return res.redirect(`/clients/list?success=` + encodeURIComponent('Client successfully removed'));
    } catch (error) {
        console.error('Erreur suppression lien client-banque :', error);
        return res.redirect(`/clients/list?error=` + encodeURIComponent('error occured'));
    }
};

exports.resetPinCode = async (req, res) => {
    const client_id = req.params.id;
    try {
        if (!client_id) {
            return res.status(400).json({ error: 'ID du client manquant' });
        }

        await apiRequest.post(`${UserbaseUrl}api/pin/reset`, { client_id }, req);

        return res.redirect(`/clients/${client_id}/listInfo?success=` + encodeURIComponent('Client pin code reset'));

    }catch (error) {
        return res.redirect(`/clients/${client_id}/listInfo?error=` + encodeURIComponent('Error in reseting the pin code'));
    }
}

exports.revertOverdraft = async (req, res) => {
  const overdraftId = req.params.id;
  const reason = req.body.reason;
  const clientId = req.query.clientId || req.body.clientId;
    
   console.log('revertOverdraft called', { overdraftId, reason, clientId });

    if (!clientId) {
        console.warn('clientId missing in revertOverdraft request');
    }
  try {

    const response = await apiRequest.post(`${OverdraftbaseUrl}api/overdrafts/revert/${encodeURIComponent(overdraftId)}`,{ reason }, req);
    console.log("response of backend", response);
  
    return res.redirect(`/clients/${clientId}/listInfo?success=` + encodeURIComponent('Overdraft reverted'));
  } catch (error) {
    console.error('Revert overdraft error:', error.response?.data || error.message);
    return res.redirect(`/clients/${clientId}/listInfo?error=` + encodeURIComponent('Error in reverting the overdraft'));
  }
};

exports.updateClient = async (req, res) => {
    try {
        const { client_id, name, msisdn, email } = req.body;

        if (!client_id || !name || !msisdn || !email) {
            return res.redirect(`/clients/${client_id}/listInfo?error=` + encodeURIComponent('All fields are required'));
        }

        // Format phone number (keep same logic as saveClient)
        const formatPhone = (number) => {
            const clean = number.replace(/^(\+?237)?0?/, '').trim();
            return `237${clean}`;
        };
        const formattedPhone = formatPhone(msisdn);

        const payload = { name, msisdn: formattedPhone, email };

        await apiRequest.put(`${UserbaseUrl}api/clients/${client_id}`, payload, req);

        return res.redirect(`/clients/${client_id}/listInfo?success=` + encodeURIComponent('Client updated successfully'));
    } catch (error) {
        console.error("❌ Error updating client:", error?.response?.data || error);
        return res.redirect(`/clients/${req.body.client_id}/listInfo?error=` + encodeURIComponent('Error updating client'));
    }
};
