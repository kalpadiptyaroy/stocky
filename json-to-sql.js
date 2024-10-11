const fs = require('fs');

const convertToSqlInsertStatement = (x, schema, tablename) => {
    let query = `INSERT INTO ${schema}.${tablename} VALUES ('${x['_id']}', '${x['CH_SYMBOL']}', '${x['CH_SERIES']}','${x['CH_MARKET_TYPE']}', '${x['CH_TIMESTAMP']}', '${x['TIMESTAMP']}',${x['CH_TRADE_HIGH_PRICE']}, ${x['CH_TRADE_LOW_PRICE']}, ${x['CH_OPENING_PRICE']}, ${x['CH_CLOSING_PRICE']},${x['CH_LAST_TRADED_PRICE']}, ${x['CH_PREVIOUS_CLS_PRICE']}, ${x['CH_TOT_TRADED_QTY']}, ${x['CH_TOT_TRADED_VAL']},${x['CH_52WEEK_HIGH_PRICE']}, ${x['CH_52WEEK_LOW_PRICE']}, ${x['CH_TOTAL_TRADES']},'${x['CH_ISIN']}', '${x['createdAt']}', '${x['updatedAt']}', ${x['__v']},${x['SLBMH_TOT_VAL']}, ${x['VWAP']}, '${x['mTIMESTAMP']}')`
    return query;
}

let sql = '';

process.argv.forEach((val, index, array) => {
    if (val.endsWith('.json')) {
        fs.readFile(val, (err, data) => {
            if (err) throw err;
            let filedata = JSON.parse(data);
            filedata.data.forEach(t => {
                sql = sql + convertToSqlInsertStatement(t, 'stocksdata', 'prices') + ';\n';
            });

            fs.writeFile(`${val.replace('json', 'sql')}`, sql, (err) => {
                if (err) throw err;
                console.log("JSON Converted to SQL in file");
            });
        })
    }
});

