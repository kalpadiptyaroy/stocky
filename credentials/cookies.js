const axios     = require("axios");
const constants = require("../constants/constants")


async function getCookies(url) {
    try {
        const response = await axios.get(url, { 
            headers: { 
                'User-Agent': constants.USER_AGENT_ALL
            }
        });
        let cookies = response.headers['set-cookie'];
        console.log("Retrieved Cookies from: ", url);
        return cookies;
    }
    catch(err) {
        console.log('Error Occured', err);
        throw new Error("Fetch cookies call failed");
    }
}

module.exports = getCookies;