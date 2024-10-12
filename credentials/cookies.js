const USER_AGENT_ALL = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
const USER_AGENT_MOZILLA = 'Mozilla/5.0 (X11; Linux x86_64)';
const USER_AGENT_APPLE = 'AppleWebKit/537.36 (KHTML, like Gecko)';
const USER_AGENT_CHROME = 'Chrome/123.0.0.0';
const USER_AGENT_EDGE = 'Edg/123.0.0.0';
const USER_AGENT_SAFARI = 'Safari/537.36';


async function getCookies(url) {
    try {
        const response = await axios.get(url, { 
            headers: { 
                'User-Agent': USER_AGENT_ALL
            }
        });
        cookies = response.headers['set-cookie'];
        console.log("Retrieved Cookies from: ", url);
        return cookies;
    }
    catch(err) {
        console.log('Error Occured', err);
    }
}

module.exports = getCookies;