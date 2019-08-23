/* @License Starts
 *
 * Copyright © 2015 - present. MongoExpUser
 *
 * License: MIT - See: https://github.com/MongoExpUser/Shale-Reservoir-DNN/blob/master/LICENSE
 *
 * @License Ends
 *
 *
 * ...Ecotert's MongoDBAndMySQLAccess.js (released as open-source under MIT License) implements:
 *
 * Relevant access to MongoDB and MySQL databases and file i/o using:
 *
 * (1) MongoDB native driver - https://www.npmjs.com/package/mongodb
 * (2) Mongoose ORM - https://www.npmjs.com/package/mongoose
 * (3) MySQL's JavaScript/Node.js driver - https://www.npmjs.com/package/mysql
 * (4) Node.js native stream modules and MongoDB's GridFS
 *
 */

class MongoDBAndMySqlAccess
{
    constructor()
    {
      return null;
    }
    
    static connectMongoDBWithMongoose(dbUserName, dbUserPassword, dbDomainURL, dbName, sslCertOptions, enableSSL)
    {
        const mongoose = require('mongoose');
        mongoose.Promise = require('bluebird');
        mongoose.set('useCreateIndex', true);
        const fs = require('fs');

        //const uri = 'mongodb://username:pasd@domain.com/dbName';
        const uri = String('mongodb://' + dbUserName + ':' + dbUserPassword + '@' + dbDomainURL + '/' + dbName);
        
        let connOptions = {};
        
        if(enableSSL === true)
        {
            connOptions = {useNewUrlParser: true, readPreference: 'primaryPreferred', maxStalenessSeconds: 90,
                           ssl: true, sslValidate: true, sslCA: sslCertOptions.ca, sslKey: sslCertOptions.key,
                           sslCert: sslCertOptions.cert, poolSize: 200
                          };
        }
        else
        {
            connOptions = {useNewUrlParser: true, readPreference: 'primaryPreferred', maxStalenessSeconds: 90,
                           ssl: false, sslValidate: false, poolSize: 200
                          };
        }
             
        //connect (authenticate) to database using promise
        mongoose.connect(uri, connOptions, function(err)
        {
            if(err)
            {
                console.log(err);
                console.log("Connection error: MongoDB-server is down or refusing connection.");
                return;
            }
        }).then(function(callbackDB)
        {
            console.log("Now connected to MongoDB Server on:", mongoose.connection.host);
            console.log();
            return callbackDB.connections[0];

        }).catch(function(err)
        {
            if(err)
            {
                console.log(err);
                console.log("Connection error: Connection refusal error detected and successfully handled.");
                return;
            };
        });
    }
    
    connectToMongoDB(dbUserName, dbUserPassword, dbDomainURL, dbName, sslCertOptions, connectionBolean=true, enableSSL=false)
    {
        const mongoose = require('mongoose');
            
        if(mongoose.connection.readyState === 1 && connectionBolean === false)
        {
            //is connected & want to close/disconnect
            mongoose.connection.close(function(err)
            {
                if(err)
                {
                    console.log(err);
                    return;
                }
                    
                console.log('NOW disconnected from MongoDB-server');
            });
        }
                
        if(mongoose.connection.readyState === 0 && connectionBolean === true)
        {
            //is closed/disconnected & want to connect
            console.log();
            console.log("Connecting......");
            MongoDBAndMySqlAccess.connectMongoDBWithMongoose(dbUserName, dbUserPassword, dbDomainURL, dbName, sslCertOptions, enableSSL);
        }
                
        process.on('SIGINT', function()
        {
            //is connected and app is terminated: then close
            mongoose.connection.close(function ()
            {
                console.log('NOW disconnected from MongoDB-server through app termination');
                console.log('  ');
                process.exit(0);
            });
                    
        }).setMaxListeners(0); //handles max event emmitter error
             
        return mongoose.connection;
    }
    
    connectToMySQL(sslCertOptions, connectionOptions, tableName, confirmDatabase=false, createTable=false, dropTable=false, enableSSL=false)
    {
        const fs = require('fs');
        const mysql = require('mysql');
        let mysqlOptions = {};
        
        if(enableSSL === true)
        {
            mysqlOptions = {host: connectionOptions.host, port: connectionOptions.port, user: connectionOptions.user,
                            password: connectionOptions.password, database: connectionOptions.database, debug: connectionOptions.debug,
                            timezone: 'Z', supportBigNumbers: true, ssl: {ca: sslCertOptions.ca, key: sslCertOptions.key, cert: sslCertOptions.cert}
                           }
        }
        else
        {
            mysqlOptions = {host: connectionOptions.host, port: connectionOptions.port, user: connectionOptions.user,
                            password: connectionOptions.password, database: connectionOptions.database, debug: connectionOptions.debug,
                            timezone: 'Z', supportBigNumbers: true, ssl: enableSSL
                           }
            
        }
        
        //get database name
        const dbName = String(connectionOptions.database);
        

        //create connection (authenticate) to database
        const nodeJSConnection = mysql.createConnection(mysqlOptions);
        
        console.log(nodeJSConnection);
        
        console.log();
        console.log("Connecting......");
                
        nodeJSConnection.connect(function(connectionError)
        {
            if(connectionError)
            {
                console.log("Connection Error: ", connectionError);
                return;
            }
                    
            console.log("Now connected to MySql server on:", connectionOptions.host);
            console.log();
            
            //then confirm table(s) exit(s) within database, and create table if desired, using callbacks/asynchronously
            if(confirmDatabase === true && dbName !== null)
            {
                var mySqlQuery = "SHOW TABLES"
                
                nodeJSConnection.query(mySqlQuery, function (confirmTableError, result)
                {
                    if(confirmTableError)
                    {
                        console.log("Table confirmation Error: ", confirmTableError);
                        return;
                    }
                      
                    if(result)
                    {
                        console.log("It is Confirmed that the TABLE(S) below exist(s) within ", dbName, "database");
                        console.log(result);
                        console.log();
                    }
                    
                    if(createTable === true)
                    {
                        //create a new table
                        const mda = new MongoDBAndMySqlAccess();
                        var mySqlQuery = mda.drillingEventCreateTableInMySQL(tableName);
                        
                        nodeJSConnection.query(mySqlQuery, function (createTableError, result)
                        {
                            if(createTableError)
                            {
                                console.log("Table creation Error: ", createTableError);
                                return;
                            }
                            
                            if(result.affectedRows > 0)
                            {
                                console.log(String(tableName) + " TABLE successfully created!");
                                console.log(result);
                                console.log();
                            }
                            
                            // insert records to the table and then show all records in the table and also drop table if desired
                            //1. insert records
                            var values = mda.drillingEventSampleValues();
                            var mySqlQuery = mda.drillingEventInsertRecordInMySQL(tableName, values);
                            
                            
                            nodeJSConnection.query(mySqlQuery, function (insertTableError, result)
                            {
                                if(insertTableError)
                                {
                                    console.log("Update TABLE Error: ", insertTableError);
                                    return;
                                }
                                
                                console.log("Records inserted into " + String(tableName) + " TABLE successfully!");
                                console.log(result);
                                console.log();
                            
                
                                //2.show records
                                var mySqlQuery = "SELECT * FROM " + String(dbName) + "." + String(tableName);
                                
                                nodeJSConnection.query(mySqlQuery, function (showTableError, result)
                                {
                                    if(showTableError)
                                    {
                                        console.log("Show TABLE Error: ", showTableError);
                                        return;
                                    }
                                
                                    console.log("Records of " + String(tableName) + " TABLE are shown below!");
                                    console.log(result);
                                    console.log();
                                    
                                
                                    //3. drop/delete table if desired
                                    if(dropTable === true)
                                    {
                                        var mySqlQuery = "DROP TABLE IF EXISTS " + String(tableName);
                                        
                                        nodeJSConnection.query(mySqlQuery, function (dropTableError, result)
                                        {
                                            if(dropTableError)
                                            {
                                                console.log("Drop/Delete TABLE Error: ", dropTableError);
                                                return;
                                            }
                                        
                                            console.log(String(tableName) + " TABLE " + " is successfully dropped/deleted!")
                                            console.log(result);
                                            console.log();
                                            
                                            nodeJSConnection.end();
                                        });
                                    }
                                    else if(dropTable !== true)
                                    {
                                        nodeJSConnection.end();
                                    }
                                    
                                    
                                });
                            });
                            
                        });
                    }
                });
            }
        });
        
        return nodeJSConnection;
    }
        
    uploadDownloadFileGridFS(collectionName, connectedDB, inputFilePath, outputFileName, action)
    {
        // method to upload and download file from MongoDB database in GridFS format
        
        const mongodb         = require('mongodb');
        const fs              = require('fs');
        const assert          = require('assert');
        const db              = connectedDB.db;
            
        const bucket  = new mongodb.GridFSBucket(db, {bucketName: collectionName, chunkSizeBytes: 1024});
               
        if(action === "upload")
        {
            const upload = fs.createReadStream(inputFilePath, {'bufferSize': 1024}).pipe(bucket.openUploadStream(outputFileName));
                
            upload.on('error', function(error)
            {
                assert.ifError(error);
            });
                
            upload.on('finish', function()
            {
                console.log('Done uploading' + inputFilePath + '!');
            });
        }
                
        if(action === "download")
        {
            const download = bucket.openDownloadStreamByName(inputFilePath).pipe(fs.createWriteStream(outputFileName), {'bufferSize': 1024});
                
            download.on('error', function(error)
            {
                assert.ifError(error);
            });
                
            download.on('finish', function()
            {
                console.log('Done downloading ' + outputFileName + '!');
            });
        }
    }
    
    uploadDownloadFileInMongoDB (dbUserName, dbUserPassword, dbDomainURL, dbName, sslCertOptions, connectionBolean, collectionName, inputFilePath, outputFileName, action)
    {
        const mda = new MongoDBAndMySqlAccess();
        const connectedDB = mda.connectToMongoDB(dbUserName, dbUserPassword, dbDomainURL, dbName, sslCertOptions, connectionBolean);
            
        connectedDB.then(function()
        {
            mda.uploadDownloadFileGridFS(collectionName, connectedDB, inputFilePath, outputFileName, action);
        }).catch(function(error)
        {
            if(error)
            {
                console.log(error, " : Uploading file error successfully intercepted and handled.");
            }
        });
    }
    
    drillingEventCreateTableInMySQL(tableName)
    {
        var mySqlQuery = "CREATE TABLE IF NOT EXISTS " + String(tableName) +
                            " (" + //primary key
                            "ROWID INT AUTO_INCREMENT PRIMARY KEY, " +
                            
                            //data from regular drilling operation
                            "ROP_fph DOUBLE, " +
                            "RPM_rpm DOUBLE, " +
                            "SPP_psi DOUBLE, " +
                            "DWOB_lb DOUBLE, " +
                            "SWOB_lb DOUBLE, " +
                            "TQR_Ibft DOUBLE, " +
                            "MUD_WEIGHT_sg DOUBLE, " +
                            "MUD_VISC_cp DOUBLE, " +
                            "MUD_FLOW_RATE_gpm DOUBLE, " +
                            "BHA_TYPE_no_unit TEXT, " +
                            
                            //data from downhole MWD/LWD tool measurements
                            "TVD_ft DOUBLE, " +
                            "MD_ft DOUBLE, " +
                            "INC_deg DOUBLE, " +
                            "AZIM_deg DOUBLE, " +
                            "CALIPER_HOLE_SIZE_inches DOUBLE, " +
                            "GR_api DOUBLE, " +
                            "DEEP_RESISTIVITY_ohm_m DOUBLE, " +
                            "SHOCK_g DOUBLE, " +
                            
                            //event data
                            "IS_VIBRATION_boolean_0_or_1 BOOLEAN, " +
                            "IS_KICK_boolean_0_or_1 BOOLEAN, " +
                            "IS_STUCKPIPE_boolean_0_or_1 BOOLEAN, " +
                            
                            //time data
                            "TIME_ymd_hms DATETIME, " +
                            
                            //constraints on some LWD data
                            "CHECK (0>=GR_api<=150), " +
                            "CHECK (0>=DEEP_RESISTIVITY_ohm_m<= 2000)" +
                        ")";
            
            return mySqlQuery;
    }
       
    drillingEventInsertRecordInMySQL(tableName, values)
    {
        const valueSeperator = ", ";
        
        if(values !== null && values !== undefined)
        {
            const actualValues =    values.ROP_fph + valueSeperator +
                                    values.RPM_rpm + valueSeperator +
                                    values.SPP_psi + valueSeperator +
                                    values.DWOB_lb + valueSeperator +
                                    values.SWOB_lb + valueSeperator +
                                    values.TQR_Ibft + valueSeperator +
                                    values.MUD_WEIGHT_sg + valueSeperator +
                                    values.MUD_VISC_cp + valueSeperator +
                                    values.MUD_FLOW_RATE_gpm + valueSeperator +
                                    values.BHA_TYPE_no_unit + valueSeperator +
                                    values.TVD_ft + valueSeperator +
                                    values.MD_ft + valueSeperator +
                                    values.INC_deg + valueSeperator +
                                    values.AZIM_deg + valueSeperator +
                                    values.CALIPER_HOLE_SIZE_inches + valueSeperator +
                                    values.GR_api + valueSeperator +
                                    values.DEEP_RESISTIVITY_ohm_m + valueSeperator +
                                    values.SHOCK_g + valueSeperator +
                                    values.IS_VIBRATION_boolean_0_or_1 + valueSeperator +
                                    values.IS_KICK_boolean_0_or_1 + valueSeperator +
                                    values.IS_STUCKPIPE_boolean_0_or_1 + valueSeperator +
                                    values.TIME_ymd_hms;
            
            var mySqlQuery = "INSERT INTO " + String(tableName) +
                                //data from regular drilling operation
                                " (ROP_fph, " +
                                "RPM_rpm, " +
                                "SPP_psi, " +
                                "DWOB_lb, " +
                                "SWOB_lb, " +
                                "TQR_Ibft, " +
                                "MUD_WEIGHT_sg, " +
                                "MUD_VISC_cp, " +
                                "MUD_FLOW_RATE_gpm, " +
                                "BHA_TYPE_no_unit, " +
                                //data from downhole MWD/LWD tool measurements
                                "TVD_ft, " +
                                "MD_ft, " +
                                "INC_deg, " +
                                "AZIM_deg, " +
                                "CALIPER_HOLE_SIZE_inches, " +
                                "GR_api, " +
                                "DEEP_RESISTIVITY_ohm_m, " +
                                "SHOCK_g, " +
                                //event data
                                "IS_VIBRATION_boolean_0_or_1, " +
                                "IS_KICK_boolean_0_or_1, " +
                                "IS_STUCKPIPE_boolean_0_or_1, " +
                                //time data
                                "TIME_ymd_hms)" +
                                //populate columns with actual values
                                " VALUE (" + actualValues + ")"
                            ")";
        }
            
        return mySqlQuery;
    }
    
    drillingEventDefaultValues()
    {
        const values = {"ROP_fph": null,
                        "RPM_rpm": null,
                        "SPP_psi": null,
                        "DWOB_lb": null,
                        "SWOB_lb": null,
                        "TQR_Ibft": null,
                        "MUD_WEIGHT_sg": null,
                        "MUD_VISC_cp": null,
                        "MUD_FLOW_RATE_gpm": null,
                        "BHA_TYPE_no_unit": null,
                        "TVD_ft": null,
                        "MD_ft": null,
                        "INC_deg": null,
                        "AZIM_deg": null,
                        "CALIPER_HOLE_SIZE_inches": null,
                        "GR_api": null,
                        "DEEP_RESISTIVITY_ohm_m": null,
                        "SHOCK_g": null,
                        "IS_VIBRATION_boolean_0_or_1": null,
                        "IS_KICK_boolean_0_or_1": null,
                        "IS_STUCKPIPE_boolean_0_or_1": null,
                        "TIME_ymd_hms": "CURRENT_TIMESTAMP()"
        }
        
        return values;
    }
    
    drillingEventSampleValues()
    {
        const values = {"ROP_fph": 30,
                        "RPM_rpm": 300,
                        "SPP_psi": 100,
                        "DWOB_lb": 350,
                        "SWOB_lb": 200,
                        "TQR_Ibft": 95,
                        "MUD_WEIGHT_sg": 1.18,
                        "MUD_VISC_cp": 3,
                        "MUD_FLOW_RATE_gpm": 35.14,
                        "BHA_TYPE_no_unit": JSON.stringify('slick'),
                        "TVD_ft": 1000,
                        "MD_ft": 1200,
                        "INC_deg": 67.2,
                        "AZIM_deg": 110.5,
                        "CALIPER_HOLE_SIZE_inches": 6,
                        "GR_api": 20,
                        "DEEP_RESISTIVITY_ohm_m": 303.3,
                        "SHOCK_g": 3,
                        "IS_VIBRATION_boolean_0_or_1": false,
                        "IS_KICK_boolean_0_or_1": false,
                        "IS_STUCKPIPE_boolean_0_or_1": false,
                        "TIME_ymd_hms": "CURRENT_TIMESTAMP()"
        }
        
        return values;
    }
}

module.exports = {MongoDBAndMySqlAccess};
