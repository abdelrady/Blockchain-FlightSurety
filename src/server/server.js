import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json'

import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
require('babel-polyfill')
const bodyParser = require('body-parser')

let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
const flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress)

// flightSuretyApp.events.OracleRequest({
//   fromBlock: 0
// }, function (error, event) {
//   if (error) console.log(error)
//   console.log(event)
// });

let oraclesList = [],
  flightsList = [],
  flightStatus = {
    0: 'unknown',
    10: 'on time',
    20: 'late due to airline'
  },
  gasLimit = 4712388,
  gasPrice = 100000000000;

let getRandomInt = function (max) {
  return Math.floor(Math.random() * Math.floor(max));
};

let submitOracleResponses = async function (flight, airline, timestamp) {
  console.log(`flight: ${flight}, airline: ${airline}, time: ${timestamp}`)
  console.log(`oracles list count: ${oraclesList.length}, submitting responses....`)
  oraclesList.forEach(async oracle => {
    console.log(`oracle: ${oracle}, fetching indexes`)
    const oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({
      from: oracle,
      gas: gasLimit,
      gasPrice: gasPrice
    })
    console.log(`oracle: ${oracle}, index: ${oracleIndexes}`)
    oracleIndexes.forEach(async index => {
      const statusCode = 20;//getRandomInt(3) * 10
      try {
        console.log(`oracle : ${oracle}, index: ${index}, code: ${statusCode}`)
        await flightSuretyApp.methods.submitOracleResponse(
          index,
          airline,
          flight,
          +timestamp,
          statusCode
        ).send({
          from: oracle,
          gas: gasLimit,
          gasPrice: gasPrice
        })
      } catch (err) { console.log(err) }
    })
  })
};

let fetchFlights = async function () {
  flightsList = []
  try {
    const flights = await flightSuretyData.methods.flights().call()
    flights.forEach(f => flightsList.push({ isRegistered: f.isRegistered, statusCode: f.statusCode, airline: f.airline, flight: f.flight, timestamp: f.updatedTimestamp._hex }));
  } catch (error) {
  }
};

// IIFE
(async function initializeApp() {

  flightSuretyApp.events.FlightRegistered()
    .on('data', async data => {
      const f = await flightSuretyData.methods.flights(data.returnValues.flightKey).call()
      flightsList.push({ isRegistered: f.isRegistered, statusCode: f.statusCode, airline: f.airline, flight: f.flight, timestamp: f.updatedTimestamp._hex });
    })
    .on('error', console.log)

  flightSuretyApp.events.OracleRequest()
    .on('error', error => { console.log(error) })
    .on('data', async data => {
      const airline = data.returnValues.airline;
      const flight = data.returnValues.flight;
      const timestamp = data.returnValues.timestamp;
      await submitOracleResponses(flight, airline, timestamp)
    })

  flightSuretyApp.events.FlightStatusInfo()
    .on('error', error => { console.log(error) })
    .on('data', async data => {
      console.log('oracles responses accepted: ' + JSON.stringify(data))
    })

    flightSuretyData.events.FlightStatusUpdated()
    .on('error', error => { console.log(error) })
    .on('data', async data => {
      console.log('FlightStatusUpdated: ' + JSON.stringify(data))
    })

    flightSuretyData.events.AmountRefundedToPassengerBalance()
    .on('error', error => { console.log(error) })
    .on('data', async data => {
      console.log('AmountRefundedToPassengerBalance: ' + JSON.stringify(data))
    })
    

  console.log('call authorizeAppContract....')
  await flightSuretyData.methods.authorizeAppContract(flightSuretyApp._address)

  //let cnt = await flightSuretyData.methods.getRegisteredAirlinesCount.call();
  //console.log('getRegisteredAirlinesCount res: ' + JSON.stringify(await cnt));

  //let isOperational = await flightSuretyApp.methods.isOperational().call();
  //console.log('isOperational res: ' + JSON.stringify(isOperational));

  let flightTimestamp = Math.floor(Date.now() / 1000);
  flightSuretyApp.methods.registerFlight("ND1309", flightTimestamp)
    .send({
      from: config.firstAirline, //accountsList[1],
      gas: gasLimit, gasPrice: gasPrice
    });
  console.log('registerFlight done...');
  //let flightKey = await flightSuretyData.methods.getFlightKey(config.firstAirline, "ND1309", flightTimestamp).call();
  //console.log('registerFlight res: ' + JSON.stringify(flightKey));
  //const flight = await flightSuretyData.methods.flights(flightKey).call()
  //console.log('flights res: ' + JSON.stringify(await flight));

  let accountsList = (await web3.eth.getAccounts());
  console.log('accountsList res: ' + JSON.stringify(accountsList.length));

  console.log('registering oracles: ');
  accountsList.slice(Math.max(accountsList.length - 20, 1))
    .forEach(async account => {
      try {
        await flightSuretyApp.methods.registerOracle().send({
          from: account,
          value: web3.utils.toWei('1', 'ether'),
          gas: gasLimit,
          gasPrice: gasPrice
        })
        oraclesList.push(account);
        console.log('registered oracle: ' + account);
      } catch (error) {
        console.log('oracle error: ' + error.message)
      }
    })

  fetchFlights();
})();

// Express & Apis part
const app = express();
app.use(bodyParser.json())
app.use(express.json())
// Add CORS middle-ware to allow for requests from other sites
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  next()
})
app.get('/airplanes/flights', (req, res) => {
  res.json(flightsList);
})
app.get('/passenger/:passenger/balance', async (req, res) => {
  let balance = await flightSuretyData.methods.passengersBalances(req.params.passenger).call();
  res.json({ balance: balance._hex, passenger: req.params.passenger });
})
app.get('/flight/:airline/:flightKey/:stamp', async (req, res) => {
  let flightKey = await flightSuretyData.methods.getFlightKey(req.params.airline, req.params.flightKey, req.params.stamp).call();
  let flight = await flightSuretyData.methods.flights(flightKey).call();
  res.send(flight);
})
app.get('/flight/key/:flightKey', async (req, res) => {
  let flight = await flightSuretyData.methods.flights(req.params.flightKey).call();
  res.send(flight);
})
app.get('/flight/:airline/:flightKey/:stamp/response', async (req, res) => {
  let flightKey = await flightSuretyData.methods.getFlightKey(req.params.airline, req.params.flightKey, req.params.stamp).call();
  let responses = await flightSuretyApp.methods.oracleResponses(flightKey).call();
  res.send(responses);
})

app.get('/flight/:airline/:flightKey/:stamp/pssenger/:passenger/ins/amount', async (req, res) => {
  
  let amount = await flightSuretyData.methods.getPassengerInsuredAmount(req.params.airline, req.params.flightKey, req.params.stamp, req.params.passenger).call();
  res.send(amount);
})


export default app;


