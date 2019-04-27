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

flightSuretyApp.events.OracleRequest({
  fromBlock: 0
}, function (error, event) {
  if (error) console.log(error)
  console.log(event)
});

let oraclesList = [],
  flightsList = [],
  flightStatus = {
    0: 'unknown',
    10: 'on time',
    20: 'late due to airline'
  };

let getRandomInt = function (max) {
  return Math.floor(Math.random() * Math.floor(max));
};

let submitOracleResponses = async function (flight, airline, timestamp) {
  oraclesList.forEach(async oracle => {
    const oracleIndexes = await flightSuretyApp.methods.getMyIndexes().call({ from: oracle })
    oracleIndexes.forEach(async index => {
      const statusCode = getRandomInt(3) * 10
      try {
        await flightSuretyApp.methods.submitOracleResponse(
          index,
          airline,
          flight,
          +timestamp,
          statusCode
        ).send({ from: oracle })
      } catch { }
    })
  })
};

let fetchFlights = async function () {
  flightsList = []
  try {
    const flights = await flightSuretyData.methods.flights().call()
    flights.forEach(f => flightsList.push({isRegistered: f.isRegistered, statusCode: f.statusCode, airline: f.airline, flight: f.flight}));
  } catch (error) {
  }
};

// IIFE
(async function initializeApp() {

  flightSuretyApp.events.FlightRegistered()
    .on('data', async log => {
      const {
        event,
        returnValues: { flightKey }
      } = log
      console.log(`${event}: flight registered ${flightKey}`)

      const f = await flightSuretyData.methods.flights(flightKey).call()
      flightsList.push({isRegistered: f.isRegistered, statusCode: f.statusCode, airline: f.airline, flight: f.flight});
    })
    .on('error', console.log)

  flightSuretyApp.events.OracleRequest()
    .on('error', error => { console.log(error) })
    .on('data', async log => {
      const {
        event,
        returnValues: { index, airline, flight, timestamp }
      } = log

      console.log(`${event}: index ${index}, flight ${flight}, airline ${airline}, timestamp ${timestamp}`)
      await submitOracleResponses(flight, airline, timestamp)
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
      gas: 4712388,
      gasPrice: 100000000000
    });
  console.log('registerFlight done...');
  //let flightKey = await flightSuretyData.methods.getFlightKey(config.firstAirline, "ND1309", flightTimestamp).call();
  //console.log('registerFlight res: ' + JSON.stringify(flightKey));
  //const flight = await flightSuretyData.methods.flights(flightKey).call()
  //console.log('flights res: ' + JSON.stringify(await flight));

  let accountsList = (await web3.eth.getAccounts());//.slice(NUMBER_OF_ACCOUNTS - numberOracles)
  // console.log('accountsList res: ' + JSON.stringify(accountsList));

  console.log('registering oracles: ');
  let numberOracles = 20
  accountsList.forEach(async account => {
    try {
      await flightSuretyApp.methods.registerOracle().send({
        from: account,
        value: web3.utils.toWei('1', 'ether'),
        gas: 4712388,
        gasPrice: 100000000000
      })
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
  //res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})
app.get('/airplanes/flights', (req, res) => {
  res.json(flightsList);
})
app.get('/flight/:airline/:flightKey/:stamp', async (req, res) => {
  let flightKey = await flightSuretyData.methods.getFlightKey(req.params.airline, req.params.flightKey, req.params.stamp).call();
  let flight = await flightSuretyData.methods.flights(flightKey).call();
  res.send(flight);
})
app.get('/flight/:airline/:flightKey/:stamp/response', async (req, res) => {
  let flightKey = await flightSuretyData.methods.getFlightKey(req.params.airline, req.params.flightKey, req.params.stamp).call();
  let responses = await flightSuretyApp.methods.oracleResponses(flightKey).call();
  res.send(responses);
})

export default app;


