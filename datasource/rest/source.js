const constants = require("../../constants/constants");
const axios     = require("axios")

async function axiosRetryInterceptor(err) {
    let config = err.config;

    // config option do not exist or retry param is not set.
    if (!config || !config?.retry) 
        return Promise.reject(err);

    // kepping track of retry count.
    config.__retryCount = config.__retryCount || 0;

    // check if we have made maximum no. of retries.
    if (config.__retryCount >= config.retry) {
        // Reject with the error
        return Promise.reject(err);
    }

    // refreshing the cookies on retry
    await preRequestGetCookies();

    // increase the retry count.
    config.__retryCount += 1;
    console.log("Retry No: ", config.__retryCount);

    // create new promise to handle exponential backoff
    let backoff = new Promise((resolve) => setTimeout(() => resolve(), config.retryDelay || 1));

    // Return the promise in which recalls axios to retry the request.
    return backoff.then(() => axios(config));
}

async function getDataFromRestSource(restUrl, cookies) {
    axios.interceptors.response.use(undefined, axiosRetryInterceptor);
    try {
        const response = await axios.get(
            restUrl,
            {
                retry: 3,
                retryDelay: 12000, // 12 sec delay
                headers: {
                    'Cookie': cookies, 
                    'User-Agent': constants.USER_AGENT_ALL
                }
            });
        return response.data.data;
    }
    catch (err) {
        console.error(err);
    }
}

module.exports = {
    getStockPrice: getDataFromRestSource
}