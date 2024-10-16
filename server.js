const dotenv = require('dotenv')
const axios = require("axios");
const { Sequelize, DataTypes } = require('sequelize');
const getCookies = require('./credentials/cookies');
const dataSource = require("./datasource/rest/source")

dotenv.config();

const baseUrl = "https://www.nseindia.com";
let sequelize = null;
let cookies = null;

async function preRequestGetCookies() {
    try {
        cookies = await getCookies(baseUrl);
        console.log('Using Cookies Credentials fetched from: ', baseUrl);
    }
    catch(err) {
        console.log('Error Occured', err);
    }
}

function buildRestUrlForSymbolAndTimeRange(symbol, fromDate, toDate) {
    const restUrl = `${baseUrl}/api/historical/cm/equity?symbol=${symbol}&series=[%22EQ%22]&from=${fromDate}&to=${toDate}`;
    return restUrl;
}

async function initializeDatabaseConnection() {
    const database = process.env.STOCKY_POSTGRES_DATABASE;
    const username = process.env.STOCKY_POSTGRES_USERNAME;
    const password = process.env.STOCKY_POSTGRES_PASSWORD;
    const host = process.env.STOCKY_POSTGRES_HOST;

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

    const priceList = await dataSource.getStockPrice(restUrl, cookies);
    console.log(priceList.length);
    try {
        const records = await Price.bulkCreate(priceList);
        console.log(records.length, ' records inserted!', `from date ${fromDate} to date ${toDate}`);
    }
    catch(err) {
        console.error(err);
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
