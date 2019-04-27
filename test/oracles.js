
var Test = require('../config/testConfig.js');
//var BigNumber = require('bignumber.js');

contract('Oracles', async (accounts) => {

  const TEST_ORACLES_COUNT = 10;

  // Watch contract events
  const STATUS_CODE_UNKNOWN = 0;
  const STATUS_CODE_ON_TIME = 10;
  const STATUS_CODE_LATE_AIRLINE = 20;
  const STATUS_CODE_LATE_WEATHER = 30;
  const STATUS_CODE_LATE_TECHNICAL = 40;
  const STATUS_CODE_LATE_OTHER = 50;
  var config;

  let flight = 'ND1309'; // Course number
  let flightTimestamp = Math.floor(Date.now() / 1000);

  before('setup contract', async () => {
    config = await Test.Config(accounts);

    await config.flightSuretyData.authorizeAppContract(config.flightSuretyApp.address)
    await config.flightSuretyApp.fund({ from: config.firstAirline, value: web3.utils.toWei('10', 'ether') })
    
    await config.flightSuretyApp.registerFlight(flight, flightTimestamp, { from: config.firstAirline });

    await config.flightSuretyApp.buy(config.firstAirline, flight, flightTimestamp, { from: accounts[7], value: web3.utils.toWei('1', 'ether') });

  });


  it('can register oracles', async () => {

    // ARRANGE
    let fee = await config.flightSuretyApp.REGISTRATION_FEE.call();

    // ACT
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {
      await config.flightSuretyApp.registerOracle({ from: accounts[a], value: fee });
      let result = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      //console.log(`Oracle Registered: ${result[0]}, ${result[1]}, ${result[2]}`);
    }
  });

  it('can request flight status', async () => {

    // ARRANGE

    // Submit a request for oracles to get status information for a flight
    await config.flightSuretyApp.fetchFlightStatus(config.firstAirline, flight, flightTimestamp);
    // ACT

    // Since the Index assigned to each test account is opaque by design
    // loop through all the accounts and for each account, all its Indexes (indices?)
    // and submit a response. The contract will reject a submission if it was
    // not requested so while sub-optimal, it's a good test of that feature
    for (let a = 1; a < TEST_ORACLES_COUNT; a++) {

      // Get oracle information
      let oracleIndexes = await config.flightSuretyApp.getMyIndexes.call({ from: accounts[a] });
      for (let idx = 0; idx < 3; idx++) {

        try {
          // Submit a response...it will only be accepted if there is an Index match
          await config.flightSuretyApp.submitOracleResponse(oracleIndexes[idx], config.firstAirline, flight, flightTimestamp, STATUS_CODE_LATE_AIRLINE, { from: accounts[a] });

        }
        catch (e) {
          // Enable this when debugging
          console.log(JSON.stringify(e));
          //console.log('\nError', idx, oracleIndexes[idx].toNumber(), flight, flightTimestamp);
        }

      }
    }
  });

  // it('request should be ended after geting sufficient answers', async () => {
  //   const key = await config.flightSuretyData.getFlightKey(config.firstAirline, flight, flightTimestamp)
  //   const request = await config.flightSuretyApp.oracleResponses(key)
  //   assert(!request.isOpen, 'request isn\'t ended')
  // })

  // it('Updates Flight Status after enough concurring answers have been received', async () => {
  //   const key = await config.flightSuretyData.getFlightKey(config.firstAirline, flight, flightTimestamp)
  //   const flightStruct = await config.flightSuretyData.flights(key)
  //   assert.equal(
  //     +flightStruct.statusCode, STATUS_CODE_LATE_AIRLINE,
  //     'Flight status was not updated correctly'
  //   )
  // })

  // it('(passenger) Can withdraw credited insurance amount', async () => {
  //   // withdrawal
  //   const balanceBefore = await web3.eth.getBalance(accounts[7])
  //   try {
  //     await config.flightSuretyApp.withdraw({ from: accounts[7] })
  //   } catch (error) {
  //     console.log(error.message)
  //   }
  //   const balanceAfter = await web3.eth.getBalance(accounts[7])
  //   // assert(+balanceBefore < +balanceAfter, 'Passenger withdrawal failed')
  // })


});
