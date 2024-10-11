const axios = require("axios");
const { Sequelize, DataTypes } = require('sequelize');

const baseUrl = "https://www.nseindia.com";
let sequelize = null;
let cookies = null;

async function preRequestGetCookies() {
    try {
        const response = await axios.get('https://www.nseindia.com/', { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0'
            }
        });
        cookies = response.headers['set-cookie'];
        console.log('Setting Cookies from nseindia.com ... . .');
    }
    catch(err) {
        console.log('Error Occured', err);
    }
}

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

async function getStockPrice(restUrl) {
    axios.interceptors.response.use(undefined, axiosRetryInterceptor);
    try {
        const response = await axios.get(
            restUrl,
            {
                retry: 3,
                retryDelay: 12000, // 12 sec delay
                headers: {
                    'Cookie': cookies, 
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0' 
                }
            });
        return response.data.data;
    }
    catch (err) {
        console.error(err);
    }
}

function buildRestUrlForSymbolAndTimeRange(symbol, fromDate, toDate) {
    const restUrl = `${baseUrl}/api/historical/cm/equity?symbol=${symbol}&series=[%22EQ%22]&from=${fromDate}&to=${toDate}`;
    return restUrl;
}

async function initializeDatabaseConnection() {
    const database = 'stocks';
    const username = 'kalpadiptya';
    const password = 'root';
    const host = 'localhost';

    sequelize = new Sequelize(database, username, password, {
        host, dialect: 'postgres', logging: false
    });
    try {
        await sequelize.authenticate();
        console.log('Connection To DB Success ... ');
        return sequelize;
    } catch (error) {
        console.error(error);
    }
}

async function setStockPriceInDB(symbol, fromDate, toDate) {
    

    const restUrl = buildRestUrlForSymbolAndTimeRange(symbol, fromDate, toDate);

    const Price = sequelize.define('price', {
        _id: { type: DataTypes.TEXT, primaryKey: true, allowNull: false },
        CH_SYMBOL: DataTypes.TEXT,
        CH_SERIES: DataTypes.TEXT,
        CH_MARKET_TYPE: DataTypes.TEXT,
        CH_TIMESTAMP: DataTypes.DATE,
        TIMESTAMP: DataTypes.DATE,
        CH_TRADE_HIGH_PRICE: DataTypes.FLOAT,
        CH_TRADE_LOW_PRICE: DataTypes.FLOAT,
        CH_OPENING_PRICE: DataTypes.FLOAT,
        CH_CLOSING_PRICE: DataTypes.FLOAT,
        CH_LAST_TRADED_PRICE: DataTypes.FLOAT,
        CH_PREVIOUS_CLS_PRICE: DataTypes.FLOAT,
        CH_TOT_TRADED_QTY: DataTypes.INTEGER,
        CH_TOT_TRADED_VAL: DataTypes.FLOAT,
        CH_52WEEK_HIGH_PRICE: DataTypes.FLOAT,
        CH_52WEEK_LOW_PRICE: DataTypes.FLOAT,
        CH_TOTAL_TRADES: { type:DataTypes.INTEGER, allowNull: true },
        CH_ISIN: DataTypes.TEXT,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
        __v: DataTypes.INTEGER,
        SLBMH_TOT_VAL: DataTypes.FLOAT,
        VWAP: DataTypes.FLOAT,
        mTIMESTAMP: DataTypes.DATE
    }, { schema: 'stocksdata'});

    const priceList = await getStockPrice(restUrl);
    try {
        const records = await Price.bulkCreate(priceList);
        console.log(records.length, ' records inserted!', `from date ${fromDate} to date ${toDate}`);
    }
    catch(err) {
        if (err.errors[0].type === 'unique violation' && err.errors[0].path === '_id' && err.errors[0].validatorKey === 'not_unique')
            console.log('Duplicate Data Insert blocked: Dupicate field: ', err.errors[0].path, 'value: ', err.errors[0].value);
    }
    
}



async function setStockPriceInDBForYearRange(symbol, fromYear, toYear) {
    const q1fromDate = `01-04-${fromYear}`;
    const q1toDate = `30-06-${fromYear}`;
    
    const q2fromDate = `01-07-${fromYear}`;
    const q2toDate = `30-09-${fromYear}`;

    const q3fromDate = `01-10-${fromYear}`;
    const q3toDate = `31-12-${fromYear}`;

    const q4fromDate = `01-01-${toYear}`;
    const q4toDate = `31-03-${toYear}`;

    return Promise.all(
        [setStockPriceInDB(symbol, q1fromDate, q1toDate), 
         setStockPriceInDB(symbol, q2fromDate, q2toDate), 
         setStockPriceInDB(symbol, q3fromDate, q3toDate),
         setStockPriceInDB(symbol, q4fromDate, q4toDate)]
    );
}

async function setupDatabaseAndCookies() {
    await Promise.all([initializeDatabaseConnection(), preRequestGetCookies()]);
}

async function main () {
    let fromYear = parseInt(process.argv[2]);
    const toYear = parseInt(process.argv[3]);
    const symbols = process.argv.slice(4);

    //TODO: Add a confirmation here before executing func.
    await setupDatabaseAndCookies(); 

    let queue = [];
    for (let s = 0; s < symbols.length; s++) {
        for (let t = fromYear; t < toYear; t++) {
            queue.push(setStockPriceInDBForYearRange(symbols[s], t, t + 1));
        }
    }
    await Promise.all(queue);
}

main();
